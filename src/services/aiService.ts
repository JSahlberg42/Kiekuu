import { getAI, getGenerativeModel, type Part } from 'firebase/ai';
import app from './firebase';
import type { GeneratedQuestion } from '../types/models';

export interface AiFileData {
  mimeType: string;
  /** Base64-encoded file contents */
  data: string;
}

// Initialize Firebase AI
const ai = getAI(app);

// Get the generative model (Gemini 3 Flash Preview)
const model = getGenerativeModel(ai, {
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
  tools: [
    { urlContext: {} } // Enable URL Context tool for direct URL processing
  ]
});

const isGeneratedQuestion = (q: unknown): q is GeneratedQuestion => {
  if (typeof q !== 'object' || q === null) return false;
  const candidate = q as Partial<GeneratedQuestion>;
  return (
    typeof candidate.question === 'string' &&
    Array.isArray(candidate.options) &&
    typeof candidate.correctIndex === 'number' &&
    typeof candidate.explanation === 'string'
  );
};

/**
 * Generate questions using AI based on context and parameters
 */
export const generateQuestions = async ({
  context,
  url,
  fileData,
  questionCount,
  difficulty,
  categoryName,
}: {
  context?: string;
  url?: string;
  fileData?: AiFileData;
  questionCount: number;
  difficulty: string;
  categoryName: string;
}): Promise<GeneratedQuestion[]> => {
  try {
    const promptText = `Olet tekoäly, joka luo tietokilpailukysymyksiä suomalaisille sopimuspalokunnille.

TEHTÄVÄ:
Luo ${questionCount} monivalintakysymystä kategoriassa "${categoryName}" vaikeustasolla "${difficulty}".

VAIKEUSTASOT:
- easy: Perustiedot, määritelmät, yksinkertaiset käsitteet
- medium: Sovellettu tieto, ymmärrys, prosessit
- hard: Analyysi, monimutkainen ymmärrys, kriittinen ajattelu
- pro: Asiantuntijataso, syvällinen tietämys, erikoistapaukset

FORMAATTI:
Palauta VAIN validi JSON-array seuraavassa muodossa:
[
  {
    "question": "Kysymysteksti?",
    "options": ["Vaihtoehto A", "Vaihtoehto B", "Vaihtoehto C", "Vaihtoehto D"],
    "correctIndex": 0,
    "explanation": "Perusteellinen selitys miksi oikea vastaus on oikein ja muut väärin.",
    "source": {
      "title": "Lähteen nimi",
      "page": "sivunumero tai kohta",
      "url": "URL jos saatavilla"
    }
  }
]

SÄÄNNÖT:
1. Jokaisessa kysymyksessä tulee olla 3-4 vastausvaihtoehtoa
2. Vain yksi vastaus on oikein (correctIndex alkaa 0:sta)
3. Selityksen tulee olla kattava ja opettavainen
4. Lähdetiedot tulee viitata annettuun kontekstiin
5. Kysymysten tulee olla relevantteja suomalaisille sopimuspalokunnille
6. Käytä selkeää suomen kieltä
7. Älä sisällytä mitään ylimääräistä tekstiä, VAIN JSON-array
${url ? `8. Hae ja analysoi sisältö URL-osoitteesta: ${url}` : '8. Lue konteksti liitetystä dokumentista (PDF) tai tekstistä'}

${url ? 'Hae sisältö annetusta URL-osoitteesta ja luo kysymykset sen perusteella.' : 'Analysoi liitetty dokumentti tai teksti ja luo kysymykset sen sisällön perusteella:'}`;

    // Prepare content for AI - support text, URL, and file (PDF) inputs
    let content: string | Array<string | Part>;
    if (url) {
      // For URLs, let the URL Context tool fetch the content
      content = promptText;
    } else if (fileData) {
      // For PDF files, send both the prompt and the file
      content = [
        promptText,
        {
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data,
          },
        },
      ];
    } else {
      // For text context, include it in the prompt
      content = `${promptText}\n\nKONTEKSTI:\n${context ?? ''}`;
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle potential markdown formatting)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse the JSON
    const parsed: unknown = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error('AI ei palauttanut kysymyksiä array-muodossa');
    }

    const questions = parsed.filter(isGeneratedQuestion);

    // Validate each question has required fields with usable values
    questions.forEach((q, index) => {
      if (!q.question || !Array.isArray(q.options) || !q.explanation) {
        throw new Error(`Kysymys ${index + 1} on puutteellinen`);
      }
      if (q.options.length < 2) {
        throw new Error(`Kysymys ${index + 1} tarvitsee vähintään 2 vaihtoehtoa`);
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`Kysymys ${index + 1} correctIndex on virheellinen`);
      }
    });

    return questions;
  } catch (error) {
    console.error('Error generating questions with AI:', error);
    throw error;
  }
};

/**
 * Extract text content from URL
 * @deprecated Gemini 3 Flash has native URL support through the URL Context tool.
 * URLs can be passed directly to generateQuestions() via the url parameter.
 */
export const fetchContentFromUrl = async (url: string): Promise<string> => {
  try {
    // Try multiple CORS proxies as fallbacks
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    let lastError: unknown;

    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        // Simple HTML to text conversion (very basic)
        const div = document.createElement('div');
        div.innerHTML = text;
        const extractedText = div.textContent || div.innerText || '';

        // Clean up whitespace
        const cleaned = extractedText
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        // Limit to reasonable length to avoid token limits
        return cleaned.substring(0, 50000);
      } catch (err) {
        lastError = err;
        console.warn(`Proxy ${proxyUrl} failed, trying next...`, err);
        continue;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw new Error('URL-haku epäonnistui. CORS-rajoitusten vuoksi URL-haku ei toimi kaikilla sivustoilla. Kopioi sisältö manuaalisesti "Teksti"-välilehdellä.', { cause: error });
  }
};

/**
 * Read and extract content from uploaded file
 * @returns For PDFs: {mimeType, data}, for text files: string content
 */
export const readFileContent = async (file: File): Promise<AiFileData | string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Handle PDFs - read as base64 for AI model
    if (file.type === 'application/pdf') {
      reader.onload = (e) => {
        try {
          if (!e.target || typeof e.target.result !== 'object' || e.target.result === null) {
            throw new Error('Tyhjä tiedosto');
          }
          // Convert ArrayBuffer to base64
          const base64 = btoa(
            new Uint8Array(e.target.result)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          resolve({
            mimeType: 'application/pdf',
            data: base64,
          });
        } catch (err) {
          reject(new Error('Virhe PDF-tiedoston lukemisessa', { cause: err }));
        }
      };

      reader.onerror = () => {
        reject(new Error('Virhe PDF-tiedoston lukemisessa'));
      };

      reader.readAsArrayBuffer(file);
    } else {
      // Handle text files (.txt, .md)
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') {
            throw new Error('Tuntematon tiedostomuoto');
          }
          // Limit to reasonable length
          resolve(text.substring(0, 50000));
        } catch (err) {
          reject(new Error('Virhe tiedoston lukemisessa', { cause: err }));
        }
      };

      reader.onerror = () => {
        reject(new Error('Virhe tiedoston lukemisessa'));
      };

      reader.readAsText(file);
    }
  });
};
