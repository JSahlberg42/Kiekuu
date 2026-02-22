import { getAI, getGenerativeModel } from 'firebase/ai';
import app from './firebase';

// Initialize Firebase AI
const ai = getAI(app);

// Get the generative model (Gemini 2.0 Flash)
const model = getGenerativeModel(ai, { 
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  }
});

/**
 * Generate questions using AI based on context and parameters
 * @param {Object} params - Generation parameters
 * @param {string} params.context - Context from URL or text
 * @param {number} params.questionCount - Number of questions to generate
 * @param {string} params.difficulty - Difficulty level (easy, medium, hard, pro)
 * @param {string} params.categoryName - Category name for context
 * @returns {Promise<Array>} Generated questions array
 */
export const generateQuestions = async ({ context, questionCount, difficulty, categoryName }) => {
  try {
    const prompt = `Olet tekoäly, joka luo tietokilpailukysymyksiä suomalaisille sopimuspalokunnille.

KONTEKSTI:
${context}

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

Luo nyt kysymykset:`;

    const result = await model.generateContent(prompt);
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
    const questions = JSON.parse(jsonText);
    
    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error('AI ei palauttanut kysymyksiä array-muodossa');
    }
    
    // Validate each question has required fields
    questions.forEach((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.correctIndex === undefined || !q.explanation) {
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
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string>} Extracted text content
 */
export const fetchContentFromUrl = async (url) => {
  try {
    // Try multiple CORS proxies as fallbacks
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];
    
    let lastError;
    
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
    
    throw lastError;
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw new Error('URL-haku epäonnistui. CORS-rajoitusten vuoksi URL-haku ei toimi kaikilla sivustoilla. Kopioi sisältö manuaalisesti "Teksti"-välilehdellä.');
  }
};

/**
 * Read and extract text from uploaded file
 * @param {File} file - File object
 * @returns {Promise<string>} Extracted text content
 */
export const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Limit to reasonable length
        resolve(text.substring(0, 50000));
      } catch (error) {
        reject(new Error('Virhe tiedoston lukemisessa'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Virhe tiedoston lukemisessa'));
    };
    
    // Read as text
    if (file.type === 'application/pdf') {
      reject(new Error('PDF-tiedostoja ei voi lukea suoraan. Kopioi teksti manuaalisesti.'));
    } else {
      reader.readAsText(file);
    }
  });
};
