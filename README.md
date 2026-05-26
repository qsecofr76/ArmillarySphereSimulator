# Simulatore 3D di una Sfera Armillare

Questo progetto è un simulatore 3D interattivo e didattico di una **Sfera Armillare**, realizzato in HTML5, CSS3 e Three.js. Il simulatore mostra la relazione geometrica ed astronomica tra il sistema di riferimento locale dell'osservatore (fisso) e il sistema equatoriale celeste (mobile), orientato per default alla latitudine dell'utente (**45° N**).

L'interfaccia utente è progettata in uno stile moderno e premium ad alto impatto visivo (*dark mode* con effetti *glassmorphism* e bagliori al neon), offrendo un'esperienza fluida a 60 FPS sia su desktop che su dispositivi mobili.

---

## Caratteristiche Principali & Colori degli Elementi

Per facilitare l'identificazione e lo studio dei singoli elementi geometrici, ogni componente è contrassegnato da colori brillanti ad effetto emissione:

1. **Elementi di Riferimento Locale (Fissi)**:
   * **Orizzonte Celeste (Verde Smeraldo - `#00f5d4`)**: Il piano orizzontale fisso dell'osservatore che divide il cielo visibile da quello invisibile. Include eleganti bordi 3D in ottone ed indicatori luminosi per i punti cardinali (Nord, Sud, Est, Ovest).
   * **Meridiano Celeste Esterno (Oro - `#ffb703`)**: L'anello verticale esterno fisso orientato Nord-Sud, passante per lo Zenit e il Nadir dell'osservatore.

2. **Elementi della Sfera Celeste (Mobili, inclinati rispetto alla Latitudine)**:
   * **Asse Polare (Ottone - `#b5a642`)**: L'asse di rotazione della sfera celeste attorno al quale avviene il moto diurno.
   * **Equatore Celeste (Azzurro Ciano - `#00bbf9`)**: La proiezione spaziale dell'equatore terrestre, perpendicolare all'asse polare.
   * **Tropici del Cancro e del Capricorno (Arancione/Rosa Neon - `#ff007f`)**: I paralleli minori posti a $\pm 23.5^\circ$ dall'equatore celeste, che segnano il limite di declinazione del Sole ai solstizi.
   * **Circoli Polari Artico e Antartico (Blu Ghiaccio - `#90e0ef`)**: I paralleli minori posti a $\pm 66.5^\circ$ dall'equatore celeste.
   * **4 Meridiani Celesti / Coluri (Viola Neon - `#9b5de5`)**: Quattro cerchi massimi verticali passanti per i poli celesti, ruotati di $45^\circ$ l'uno rispetto all'altro.

3. **Globo Terrestre Centrale (`#4cc9f0` / `#060a17`)**:
   * Posizionato al centro esatto (modello geocentrico classico).
   * Generato tramite una **texture procedurale ad alta definizione creata interamente in codice Javascript**, il che permette all'applicazione di funzionare al 100% offline, senza caricare immagini esterne e senza incorrere in blocchi CORS del browser.
   * Mostra i continenti con confini neon e include l'asse terrestre e **4 meridiani terrestri** sottili che avvolgono il globo.

---

## Controlli Interattivi

La barra laterale sinistra e l'HUD in alto a destra permettono un controllo totale sul simulatore:
* **Slider Latitudine**: Consente di variare dinamicamente l'inclinazione dell'asse del mondo e dell'intera sfera mobile da $-90^\circ$ (Polo Sud) a $+90^\circ$ (Polo Nord). La configurazione di partenza è impostata a **45°** (mezzeria esatta, tipica del Nord Italia).
* **Controlli di Rotazione**:
  * **Play/Pause Sfera**: Avvia o ferma la rotazione diurna apparente della sfera celeste attorno all'asse terrestre.
  * **Rotazione Terra**: Consente di far ruotare la Terra attorno al suo asse (visualizzazione eliocentrica/copernicana).
  * **Velocità di Simulazione**: Modifica la velocità di rotazione da 0x a 4x.
* **Toggle Visibilità**: Permette di accendere/spegnere singolarmente la visibilità di qualsiasi anello o del globo per semplificare lo studio visivo delle geometrie.
* **Guida Didattica Interattiva**: Facendo clic sulle schede informative in fondo alla barra laterale, viene visualizzata una breve descrizione in italiano del significato astronomico di ciascun cerchio.

---

## Come Avviare il Simulatore

L'applicazione è completamente autonoma e racchiusa nei tre file principali (`index.html`, `style.css`, `app.js`).

### Metodo 1: Apertura Diretta (Nessuna installazione richiesta)
Poiché le librerie esterne (Three.js ed OrbitControls) sono caricate tramite CDN standard non-modulari e la texture della Terra è disegnata in modo procedurale via codice, **puoi avviare il simulatore semplicemente facendo doppio clic sul file `index.html`** da qualsiasi browser moderno.
*Funziona completamente offline e senza problemi di restrizioni CORS locali (`file://`).*

### Metodo 2: Tramite Server Locale (Consigliato per prestazioni ottimali)
Se preferisci servirlo tramite un server web locale, puoi usare qualsiasi estensione (es. *Live Server* di VS Code) o lanciare un comando da terminale nella cartella del progetto:

**Usando Node.js / npx:**
```bash
npx http-server ./
```

**Usando Python:**
```bash
python -m http.server 8000
```
Dopodiché, apri il browser e naviga su `http://localhost:8000`.

---

## Navigazione 3D della Telecamera
* **Ruotare la vista**: Tieni premuto il **tasto sinistro del mouse** e trascina in qualsiasi direzione.
* **Spostare la telecamera (Pan)**: Tieni premuto il **tasto destro del mouse** (o il tasto `Shift` + tasto sinistro) e trascina.
* **Zoom**: Usa la **rotella del mouse** o esegui un gesto di pizzicamento sul trackpad/touchscreen.
