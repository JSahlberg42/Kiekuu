# AI Question Generator - Käyttöohje

## Yleiskatsaus
AI-kysymysgeneraattori käyttää Firebase Vertex AI:ta (Gemini 1.5 Flash) luomaan automaattisesti tietokilpailukysymyksiä oppimateriaalin pohjalta.

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
- Paras vaihtoehto, jos materiaali on helposti kopioitavissa

#### Vaihtoehto B: URL
- Anna julkisen verkkosivun URL-osoite
- Huom: CORS-rajoitukset voivat estää joidenkin sivustojen käytön
- AI yrittää purkaa HTML:n tekstimuotoon automaattisesti

#### Vaihtoehto C: Tiedosto
- Lataa .txt tai .md -tiedosto
- Maksimi ~50,000 merkkiä
- PDF-tiedostoja ei tueta suoraan (kopioi teksti manuaalisesti)

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

## Rajoitukset

- Maksimi kontekstin pituus: ~50,000 merkkiä
- Maksimi kysymysten määrä: 20 per kerta
- PDF-tiedostoja ei tueta suoraan
- Jotkin URL:t voivat olla CORS-suojattuja
- AI voi generoida epätarkkoja kysymyksiä - tarkista aina!

## Tekninen toteutus

- **AI-malli**: Gemini 1.5 Flash (Firebase Vertex AI)
- **Temperature**: 0.7 (tasapainoinen luovuus)
- **Formaatti**: Strukturoitu JSON-vastaus
- **Kieli**: Suomi
- **Validointi**: Automaattinen rakenteiden tarkistus

## Tietoturva

- AI käsittelee vain antamasi kontekstin
- Generoidut kysymykset tallennetaan Firestore-tietokantaan
- Vain adminit voivat käyttää AI-generaattoria
- Kaikki API-kutsut ovat suojattuja Firebase-autentikaatiolla
