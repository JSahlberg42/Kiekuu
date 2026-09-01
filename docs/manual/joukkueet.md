# Joukkueet (Tiimit)

*Osa Kiekuu-oppimisalustaa. Päivitetty syyskuu 2026.*

---

## Yleiskatsaus

**Joukkueet** mahdollistavat VPK-yhteisöjen välisen kilpailun ja ystävällisten taisteluiden järjestämisen. Voit luoda oman tiimin palokunnallesi tai liittyä olemassa olevaan tiimiin.

### Keskeiset ominaisuudet

- **Oman tiimin luonti** — nimeä ja kuvaa tiimi
- **Liittyminen tiimiin** — liity tunnuksen avulla
- **Tiimin jäsenet** — näet kaikki tiimin jäsenet ja heidän tuloksensa
- **Joukkueiden tulostaulukko** — vertailu muihin tiimeihin
- **Joukkueen yhteispistemäärä** — tiimin kaikkien jäsenten pisteet lasketaan yhteen
- **Suostumus** — tiimiin liittyminen edellyttää suostumusta siihen, että tiimin jäsenet näkevät profiilikuvan, nimen ja pisteet

---

## Joukkueiden tulostaulukko

Joukkueiden tulostaulukko näyttää kaikki tiimit sijoituksen mukaan:

| Sijoitus | Tiimi | Jäseniä | Yhteispistemäärä |
|---|---|---|---|
| 1. | Oulun VPK | 12 | 4 230 |
| 2. | Tampereen VPK | 8 | 3 800 |
| 3. | ... | ... | ... |

Sivun yläosassa näkyy myös oma tiimisi kortti, jos olet jossain tiimissä.

---

## Oma tiimi

Kun olet tiimin jäsen, näet omalla tiimisivullasi:

- **Tiimin nimi ja kuvaus**
- **Yhteispistemäärä** — kaikkien jäsenten pisteet yhteensä
- **Sijoitus** — tiimisi sijoitus kaikkien tiimien joukossa
- **Jäsenlista** — kaikki tiimin jäsenet (profiilikuva, nimi, sijoitus, henkilökohtainen pistemäärä)

### Tiimin toiminnot

- **Kopioi tunnus** — kopioi tiimin tunnus (teamId) ja lähetä se muille
- **Muokkaa** — muuta tiimin nimeä ja kuvausta (vain tiimin luoja)
- **Poista tiimi** — poista koko tiimi (vain tiimin luoja)
- **Poistu tiimistä** — poistu tiimistä itse

---

## Uuden tiimin luonti

### Edellytykset

- Sinulla on oltava Kiekuu-tunnus
- **Et saa olla jo toisessa tiimissä** — poistu ensin nykyisestä tiimistä

### Vaiheet

1. Siirry **Joukkueet**-sivulle
2. Klikkaa **Luo uusi joukkue**
3. Täytä lomake:
   - **Nimi** (1–40 merkkiä, pakollinen) — esim. "Oulun VPK"
   - **Kuvaus** (valinnainen, max 200 merkkiä) — esim. "Oulun alueen vapaaehtoinen palokunta"
4. Rastita suostumusruutu: *"Hyväksyn, että profiilikuvani, nimeni ja pisteeni näkyvät muille tiimin jäsenille."*
5. Klikkaa **Luo joukkue**

Luotuasi tiimin olet sen ainoa jäsen. Saat tiimin tunnuksen (teamId), jonka voit jakaa muille.

---

## Tiimiin liittyminen

### Tunnuksen saaminen

Tiimin tunnuksen (teamId) saat tiimin luojalta. Tunnus näkyy onnistuneen luomisen jälkeen "Kopioi tunnus" -painikkeella.

### Vaiheet

1. Siirry **Joukkueet**-sivulle
2. Klikkaa **Liity joukkueeseen**
3. Syötä tiimin tunnus (teamId)
4. Rastita suostumusruutu
5. Klikkaa **Liity joukkueeseen**

---

## Suostumus ja yksityisyys

### Miksi suostumus vaaditaan?

Joukkueen jäsenet eivät ole anonyymejä. Tiimiin liittyminen edellyttää, että hyväksyt tiimin jäsenten näkevän:

- **Profiilikuvan**
- **Näyttönimen**
- **Pistemäärän**
- **Sijoituksen**

### Suostumuksen peruuttaminen

Voit peruuttaa suostumuksen poistumalla tiimistä. Poistuessasi suostumusasetus nollautuu automaattisesti.

---

## Yleiset kysymykset

### Voinko olla useammassa kuin yhdessä tiimissä?

Ei. Yksi käyttäjä voi kuulua vain yhteen tiimiin kerrallaan.

### Voiko tiimin luoja poistaa jäseniä?

Kyllä. Tiimin luoja näkee kaikki jäsenet ja voi poistaa heitä. Järjestelmänvalvoja (admin) voi myös poistaa jäseniä Joukkueet-hallintasivulta.

### Miten tiimin pisteet lasketaan?

Tiimin yhteispistemäärä on kaikkien jäsenten henkilökohtaisten pistemäärien summa. Pistemäärä päivittyy jokaisen visailun yhteydessä.

### Miten tiimin jäsenet päivittyvät?

Kun jäsen poistuu tiimistä, tiimin yhteispistemäärä vähennetään poistuneen jäsenen pisteiden verran. Tyhjäksi jäänyt tiimi poistetaan automaattisesti.

### Miten voin jakaa tiimin muille?

1. Avaa tiimisi **Joukkueet**-sivulta
2. Klikkaa **Kopioi tunnus** -painiketta
3. Lähetä tunnus haluamallasi tavalla (viesti, sähköposti jne.)
4. Vastaanottaja liittyy **Liity joukkueeseen** -toiminnolla

---

## Järjestelmänvalvojan toiminnot

Järjestelmänvalvoja (admin) voi hallita kaikkia tiimejä **Joukkueet**-hallintasivulta (`/admin/teams`):

- **Nähdä kaikki tiimit** — nimi, jäsenmäärä, yhteispistemäärä
- **Nähdä tiimin jäsenet** — jokaisen jäsenen tiedot
- **Poistaa jäsenen** — poistaa jäsenen tiimistä
- **Muokata tiimiä** — muuttaa nimeä ja kuvausta
- **Poistaa tiimin** — poistaa koko tiimin

Hallintasivulle pääsee: **Admin → Hallitse joukkueita**
