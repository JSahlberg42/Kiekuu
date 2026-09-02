# Joukkueet

Joukkueet mahdollistavat yhteisen harjoittelun ja kilpailun VPK-kavereiden kanssa.

---

## Miten pistelasku toimii?

Joukkueen kokonaispistemäärä on kaikkien jäsenten henkilökohtaisten pistemäärien summa. Mitä useampi jäsen harjoittelee, sitä korkeammalle joukkue nousee tulostaulukossa.

Joukkueen sijoitus päivittyy automaattisesti aina, kun jokin jäsen vastaa tietovisan kysymykseen oikein.

---

## Joukkueen luominen

1. Siirry kohtaan **Joukkueet**
2. Valitse **"Luo uusi joukkue"**
3. Anna joukkueelle nimi (pakollinen) ja kuvaus (valinnainen)
4. Hyväksy suostumus tietovisojen jakamisesta joukkueen jäsenten kanssa
5. Valitse **"Luo joukkue"**

Joukkueen luomisen jälkeen näet joukkueen tunnuksen (ID), jonka voit jakaa muille.

> ⚠️ **Anonyymit käyttäjät** eivät voi luoda tai liittyä joukkueisiin. Rekisteröidy ensin.

---

## Joukkueeseen liittyminen

1. Siirry kohtaan **Joukkueet**
2. Valitse **"Liity joukkueeseen"**
3. Syötä joukkueen tunnus (ID), jonka olet saanut joukkueen perustajalta
4. Hyväksy suostumus tietovisojen jakamisesta
5. Valitse **"Liity"**

Voit olla vain yhdessä joukkueessa kerrallaan.

---

## Suostumus ja yksityisyys

Kun liityt joukkueeseen tai luot joukkueen, annat suostumuksen siihen, että:

- Nimesi näytetään muille joukkueen jäsenille
- Pisteesi ja tasosi näkyvät joukkueen jäsenille
- Voit peruuttaa suostumuksen milloin tahansa poistumalla joukkueesta

Anonyymejä jäseniä ei sallita.

---

## Joukkueesta poistuminen

Valitse **"Poistu joukkueesta"** omalla joukkuekortilla. Suostumus peruuntuu automaattisesti.

---

## Usein kysytyt kysymykset

**Voinko vaihtaa joukkkuetta?**
Kyllä. Poistu nykyisestä joukkueesta ja liity uuteen.

**Mitä jos joukkueen perustaja poistuu?**
Joukkue säilyy, mutta sen perustajatieto tyhjenee. Voit edelleen harjoitella joukkueessa.

**Miten joukkueen tunnus toimii?**
Joukkueen tunnus on Firestore-dokumentin yksilöllinen tunniste. Se ei ole henkilötieto.

---

## Ylläpito (ylläpitäjät)

Sovelluksen ylläpitäjät voivat tarkastella ja hallita kaikkia joukkueita hallintapaneelin kautta. Hallintatoiminnot eivät ole tavallisten käyttäjien saatavilla.

---

## Suostumus ja yksityisyys

<<<<<<< HEAD
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
=======
Kun liityt joukkueeseen tai luot joukkueen, annat suostumuksen siihen, että:

- Nimesi näytetään muille joukkueen jäsenille
- Pisteesi ja tasosi näkyvät joukkueen jäsenille
- Voit peruuttaa suostumuksen milloin tahansa poistumalla joukkueesta

Anonyymejä jäseniä ei sallita.

---

## Joukkueesta poistuminen

Valitse **"Poistu joukkueesta"** omalla joukkuekortilla. Suostumus peruuntuu automaattisesti.

---

## Usein kysytyt kysymykset

**Voinko vaihtaa joukkkuetta?**
Kyllä. Poistu nykyisestä joukkueesta ja liity uuteen.

**Mitä jos joukkueen perustaja poistuu?**
Joukkue säilyy, mutta sen perustajatieto tyhjenee. Voit edelleen harjoitella joukkueessa.

**Miten joukkueen tunnus toimii?**
Joukkueen tunnus on Firestore-dokumentin yksilöllinen tunniste. Se ei ole henkilötieto.

---

## Ylläpito (ylläpitäjät)

Sovelluksen ylläpitäjät voivat tarkastella ja hallita kaikkia joukkueita hallintapaneelin kautta. Hallintatoiminnot eivät ole tavallisten käyttäjien saatavilla.
>>>>>>> 7a5aaa7 (docs: add Tietosuoja + Joukkueet guides, link privacy from SignUp)
