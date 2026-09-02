---
layout: default
title: Tietosuoja
nav_order: 99
---

# Tietosuoja

Kiekuu on sitoutunut suojaamaan käyttäjiensä yksityisyyttä.

---

## Kerättävät tiedot

Kiekuu käyttää **Firebase-palveluit** (Google) seuraaviin tarkoituksiin:

| Palvelu | Mitä kerätään | Miksi |
|---|---|---|
| **Firebase Analytics** | Sivulataukset, tapahtumat (esim. tietovisa aloitettu), istunnon kesto, sovelluksen versio | Tuotekehitys ja käyttökokemuksen parantaminen |
| **Firebase Auth** | Sähköpostiosoite (jos rekisteröitynyt), anonyymi tunniste | Kirjautuminen ja käyttäjätili |
| **Firestore** | Käyttäjäprofiili, pistemäärä, taso, kysymysvastaukset | Sovelluksen toiminta |
| **App Check** | Laitetiedot (reCAPTCHA) | Roskapostin ja väärinkäytön esto |

Kerättävät tiedot ovat **anonymisoituja tai pseudonymisoituja** Firebase Analyticsissa. Tietoja ei myydä kolmansille osapuolille.

---

## Tietojen säilytys

- **Firebase Analytics:** Google säilyttää tietoja enintään 14 kuukautta (GA4-oletus).
- **Firestore:** Tiedot säilyvät, kunnes käyttäjä poistaa tilinsä tai pyytää tietojensa poistoa.
- **Käyttäjätilin poistaminen:** Ota yhteyttä kehittäjään (ks. alla).

---

## Analysointitapahtumat

Seurantatapahtumia ovat:

- `session_start` — istunnon aloitus
- `page_view` — sivulataukset
- `quiz_started`, `answer_submitted`, `quiz_completed` — tietovisan käyttö
- `team_created`, `team_joined`, `team_left` — joukkueominaisuuden käyttö
- `leaderboard_viewed` — tulostaulukon katselu

Tapahtumat eivät sisällä henkilökohtaisia vastauksia tai kysymyssisältöjä.

---

## Evästeet

Kiekuu ei käytä evästeitä suoramarkkinointiin. Firebase SDK voi asettaa teknisiä evästeitä sovelluksen toimintaa varten.

---

## Kolmannet osapuolet

Kiekuu käyttää seuraavia kolmansien osapuolten palveluita:

- **Google Firebase** — sovellusalusta, autentikointi, tietokanta, analytiikka
- **Google Vertex AI / Gemini** — kysymysten luonti ja selitykset (hallinnoidusti, ei opetusdataa)

Näiden palveluiden tietosuojakäytännöt:
- [Firebase Privacy](https://firebase.google.com/support/privacy)
- [Google Privacy Policy](https://policies.google.com/privacy)

---

## Oikeutesi

Sinulla on oikeus:

- Saada tietää, mitä tietoja sinusta kerätään
- Pyytää tietojesi poisto
- Kieltäytyä analysoinnista — ota yhteyttä kehittäjään

---

## Yhteys

Tietosuojaan liittyvät kysymykset ja tietopyynnöt:
**Jussi Sahlberg** — [github.com/JSahlberg42](https://github.com/JSahlberg42)

---

*Tämä dokumentti päivitetään tarvittaessa. Viimeksi tarkistettu: 2026.*
