# Kiekuu 🐓📢

**Kiekuu** on pelillistetty oppimisalusta, joka on suunniteltu Suomen sopimuspalokuntien (VPK) koulutustarpeisiin. Se toimii osaamisen "herättäjänä" ja teoreettisena pohjana **Vaste**-ekosysteemille.

Sovellus noudattaa **Pelastusopiston sopimushenkilöstön opetussuunnitelmaa (OPS)**.

## 🌟 Avainominaisuudet
- **OPS-pohjainen progressio:** Sisältö on jaettu tasoihin, jotka vastaavat Pelastusopiston kurssikokonaisuuksia (Harjoittelija -> Miehistö -> Esimies -> Päällikkö).
- **Älykäs Tutor (Vertex AI):** Väärän vastauksen sattuessa Firebase AI selittää vastauksen perustuen viralliseen kurssimateriaaliin.
- **Lähdeviittaukset:** Jokainen vastaus sisältää viitteen viralliseen oppimateriaaliin tai lainsäädäntöön (esim. Pelastustieto, OPS-oppaat).
- **Vaste-integraatio:** Kiekuu valmentaa käyttäjän ammattitaitoa, jotta operatiivinen työ Vaste-sovelluksella on sujuvaa.

## 🛠 Teknologia-pino
- **Frontend:** React + Vite + TypeScript
- **Tyylittely:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **AI-moottori:** Vertex AI for Firebase (Gemini 1.5 Flash)
- **Mobiili-silta:** Capacitor

## 📈 Tasojärjestelmä
1. **Harjoittelija:** Palokuntatoiminnan perusteet, työturvallisuus ja yksikkötunnusten perusteet.
2. **Miehistö:** Pelastustoiminnan peruskurssi & sammutustekniikka (esim. ABCDE, tieliikennepelastaminen).
3. **Esimies:** Yksikönjohtajakurssi (YS) (Taktiikka, VIRVE-viestintä, tilannearvio).
4. **Päällikkö:** Hallinnollinen johtaminen, vastuut ja lainsäädäntö.

## 📄 Lisenssi
Tämä projekti on lisensoitu **MIT-lisenssillä**.
