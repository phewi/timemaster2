# TimeMaster2 - Kilpailuversio

Verkkopohjainen ammunta-ajastin jousiammuntakilpailuihin. Tarjoaa selkeän, korkeakontrastisen näytön muokattavilla väreillä ja taustamusiikin tuella.

Kokeile: https://phewi.github.io/timemaster2/
 
## Käyttöönotto

### Vaatimukset
- Python 3.x asennettuna järjestelmään

### Asennus ja käynnistys

1. **Lataa tiedostot** paikalliselle koneelle

2. **Lisää musiikkitiedostot** (valinnainen):
   - Aseta MP3-tiedostot `musiikki/` kansioon
   - Esimerkkitiedostot voi poistaa kansiosta.

3. **Käynnistä palvelin**:
   ```bash
   python server.py
   ```

4. **Avaa selaimessa**:
   - Mene osoitteeseen `http://localhost:8000`
   - Avaa `index.html` päänäkymä
   - Avaa `uusinta.html` uusintanuolen ajastimelle (tai paina U päänäkymässä)

## Käyttöohjeet

Ohjelma on tarkoitettu näppäimistöllä halittavaksi. Tavoitteena on että ammunnanjohtajan tarvitsee tyypillisesti painaa vain yhtä nappia (Enter).

### Pikanäppäimet

#### Pääikkuna (index.html)
- **Enter**: Aloita ammunta tai siirry seuraavaan vaiheeseen
- **Välilyönti (Spacebar)** tai **H**: Hätäseis - pysäytä kaikki toiminta välittömästi
- **S**: Käynnistä/pysäytä taustamusiikki (vain odotustilassa)
- **U**: Avaa uusintanuolen ikkuna uudessa välilehdessä
- **K**: Piilota/näytä kello (vain odotustilassa)
- **A**: Kiinnitä/irrota asetukset (vain odotustilassa)

#### Uusintanuolen ikkuna (uusinta.html)
- **Enter**: Aloita uusintanuolen ajoitus tai siirry seuraavaan vaiheeseen
- **Välilyönti (Spacebar)** tai **H**: Hätäseis - pysäytä kaikki toiminta välittömästi

### Ampumistila
- Aktivoi ampumistila kilpailun aikana
- Näyttö mukautuu näyttämään tärkeimmät tiedot selkeästi
- Taustamusiikki pysyy samana

### Musiikin käyttö
- Musiikkitiedostot ladataan automaattisesti `musiikki/` kansiosta
- Valitse taustamusiikki kilpailun tunnelman mukaan
- Tukee MP3-muotoa

### Näytön asetukset
- Sovellus on optimoitu suurille näytöille ja projektoreille
- Fonttikoko ja layout mukautuvat automaattisesti
- Käytä koko näytön tilaa parhaan näkyvyyden saamiseksi

## Kansiorakenne

```
timemaster2/
├── index.html          # Pääkilpailuaikamittarin käyttöliittymä
├── uusinta.html        # Uusintanuolen aikamittari
├── server.py           # Python-palvelin musiikki-API:lla
└── musiikki/           # Musiikkikansio (MP3-tiedostot)
    ├── kappale1.mp3
    ├── kappale2.mp3
    └── ... (lisää musiikkitiedostoja)
```

## Mukauttaminen

### Musiikin lisääminen
- Pudota MP3-tiedostot `musiikki/` kansioon
- Palvelin tunnistaa ne automaattisesti seuraavalla käynnistyksellä

### Värien muuttaminen
Värimaailmoja voi muuttaa CSS-tiedostoissa:
- `.mode-red`: Oletus punainen teema (#B30000)
- `.mode-yellow`: Keltainen teema (#DAA520)
- `.mode-green`: Vihreä teema (#008000)

### Näytön kokoonpano
- Fonttikoot ja layout on optimoitu suurille näytöille
- Voit muuttaa CSS:ssä eri näyttökokoja varten

## Vianmääritys

### Palvelin ei käynnisty
- Varmista että Python 3.x on asennettu
- Tarkista ettei portti 8000 ole jo käytössä

### Musiikki ei soi
- Tarkista että MP3-tiedostot ovat `musiikki/` kansiossa
- Varmista tiedostojen olevan oikeassa muodossa

### Näyttö ei näy oikein
- Käytä modernia selainta (Chrome, Firefox, Edge)
- Kokeile koko näytön tilaa (F11)

## Lisenssi

Tämä projekti on avointa lähdekoodia. Noudata tekijänoikeuslakeja musiikkitiedostoja käytettäessä.