# AI Question Generator - Käyttöohje

## Yleiskatsaus
AI-kysymysgeneraattori käyttää Firebase Vertex AI:ta (Gemini 3 Flash) luomaan automaattisesti tietokilpailukysymyksiä oppimateriaalin pohjalta. Tukee tekstiä, URL-osoitteita ja PDF-dokumentteja.

## Käyttö

### 1. Avaa AI-generaattori
- Siirry Admin → Question Management
- Klikkaa "AI-generaattori" -painiketta (violetti nappi salamakuvakkeella)

### 2. Valitse parametrit

#### Kategoria
- Valitse kategoria, johon kysymykset tallennetaan
- Kategoria vaikuttaa myös AI:n kontekstiin

#### Kysymysten määrä
- 1-20 kysymystä per generointikerta
- Suositus: 5-10 kysymystä kerralla parempaan laatuun

#### Vaikeustaso
- **Easy**: Perustiedot, määritelmät, yksinkertaiset käsitteet
- **Medium**: Sovellettu tieto, ymmärrys, prosessit
- **Hard**: Analyysi, monimutkainen ymmärrys, kriittinen ajattelu
- **Pro**: Asiantuntijataso, syvällinen tietämys, erikoistapaukset

### 3. Anna konteksti

#### Vaihtoehto A: Teksti
- Kopioi ja liitä oppimateriaali suoraan tekstikenttään
- Maksimi ~50,000 merkkiä
- Paras vaihtoehto kun materiaali on helposti kopioitavissa

#### Vaihtoehto B: URL (Suositeltu verkkoyhteydellä)
- Anna julkisen verkkosivun URL-osoite
- **Gemini 3 Flash URL Context -työkalu** hakee sisällön suoraan
- **Ei CORS-rajoituksia**: AI hakee sisällön palvelinpuolella
- Tukee: HTML-sivut, PDF:t, JSON, XML, CSV, tekstiedostot
- Maksimi 34MB per URL, jopa 20 URL:ia per pyyntö
- URL:ien tulee olla julkisesti saatavilla (ei maksumuureja tai kirjautumista)

#### Vaihtoehto C: Tiedosto
- Lataa .txt, .md tai .pdf -tiedosto
- **PDF-tuki**: Gemini 3 Flash osaa lukea PDF-dokumentteja suoraan
- Tekstipohjaiset tiedostot maksimi ~50,000 merkkiä
- PDF:t voivat olla laajempia ja sisältää kuvia/kaavioita

### 4. Generoi kysymykset
- Klikkaa "Generoi kysymykset"
- Odota 10-30 sekuntia (riippuen kysymysten määrästä)
- AI luo kysymykset annetun kontekstin pohjalta

### 5. Tarkista ja muokkaa
- Tarkista generoidut kysymykset
- Oikea vastaus näkyy vihreällä
- Voit poistaa yksittäisiä kysymyksiä (X-nappi)
- Klikkaa "Takaisin" tehdäksesi uuden generoinnin

### 6. Tallenna
- Klikkaa "Tallenna kaikki" lisätäksesi kysymykset tietokantaan
- Kaikki kysymykset tallennetaan kerralla
- Voit muokata niitä myöhemmin normaalisti kysymystenhallinnassa

## AI:n generoima rakenne

Jokainen kysymys sisältää:
- **Kysymysteksti**: Selkeä, kontekstiin perustuva kysymys
- **Vastausvaihtoehdot**: 3-4 vaihtoehtoa per kysymys
- **Oikea vastaus**: Yksi vaihtoehto merkitty oikeaksi
- **Selitys**: Perusteellinen selitys, miksi vastaus on oikein
- **Lähde**: Viittaus annettuun kontekstiin

## Vinkit parhaaseen tulokseen

1. **Anna riittävästi kontekstia**
   - Mitä enemmän materiaalia, sitä paremmat kysymykset
   - Vähintään 500-1000 sanaa suositeltavaa

2. **Käytä laadukasta lähdettä**
   - Viralliset oppaat ja käsikirjat
   - Ajantasainen tieto
   - Selkeästi kirjoitettu materiaali

3. **Tarkista aina tulokset**
   - AI voi tehdä virheitä
   - Varmista, että kysymykset ovat relevantteja
   - Tarkista oikeiden vastausten oikeellisuus

4. **Aloita pienellä**
   - Testaa ensin 3-5 kysymyksellä
   - Jos tulos on hyvä, voit generoida enemmän

5. **Vaikeustason valinta**
   - Easy: Aloittelijoille ja perusteiden kertaukseen
   - Medium: Normaaliin koulutuskäyttöön
   - Hard: Kokeneemmille käyttäjille
   - Pro: Erikoisosaamisen testaamiseen

6. **PDF-dokumenttien käyttö**
   - Suosi selkeitä, hyvin muotoiltuja PDF:iä
   - AI osaa lukea tekstiä, taulukoita ja kuvatekstejä
   - Skannatut kuvat (ilman OCR:ia) eivät toimi optimaalisesti

7. **URL-osoitteiden käyttö**
   - Varmista, että URL on julkisesti saatavilla
   - Wikipedia, viralliset oppaat ja dokumentaatiosivut toimivat erinomaisesti
   - AI hakee sisällön suoraan ilman CORS-ongelmia
   - Voit antaa jopa 20 URL:ia kerralla (erotettu pilkulla tai annettuna erikseen)

## Rajoitukset

- Maksimi kontekstin pituus: ~50,000 merkkiä (tekstit)
- URL-tuki: Max 20 URL:ia, 34MB per URL, 1M token yhteensä
- PDF: Koko dokumentti (ei merkkirajoitusta), skannatut kuvat saattavat heikentää laatua
- Maksimi kysymysten määrä: 20 per kerta
- URL-vaatimukset: Julkisesti saatavilla, ei maksumuureja tai kirjautumista
- AI voi generoida epätarkkoja kysymyksiä - tarkista aina!

## Tekninen toteutus

- **AI-malli**: Gemini 3 Flash Preview (Firebase Vertex AI)
- **Temperature**: 0.7 (tasapainoinen luovuus)
- **Työkalut**: URL Context tool (natiivi URL-tuki)
- **Tuetut syötteet**: Teksti, URL (HTML/PDF/JSON/XML/CSV), PDF-tiedostot
- **URL-käsittely**: Suora haku palvelinpuolella, ei CORS-rajoituksia
- **PDF-käsittely**: Base64-enkoodaus, suora lähetys mallille
- **Formaatti**: Strukturoitu JSON-vastaus
- **Kieli**: Suomi
- **Validointi**: Automaattinen rakenteiden tarkistus

## Tietoturva

- AI käsittelee vain antamasi kontekstin
- Generoidut kysymykset tallennetaan Firestore-tietokantaan
- Vain adminit voivat käyttää AI-generaattoria
- Kaikki API-kutsut ovat suojattuja Firebase-autentikaatiolla
