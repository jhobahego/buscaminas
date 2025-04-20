let tablero = []; // The internal game board (stores 'M' for mine, 0 for empty, or number of adjacent mines)
let tamañoTableroUsuario = 10; // Default board size
let cantidadMinasUsuario = 15; // Default number of mines
let celdasCubiertas; // Counter for remaining covered cells
let juegoTerminado = false; // Game state flag
let banderasColocadas = 0; // Counter for flags placed
let timerInterval; // Interval ID for the game timer
let tiempoTranscurrido = 0; // Seconds elapsed
let clicsIzquierdos = 0, clicsDerechos = 0; // Click counters

const tableroElement = document.getElementById('tablero');
const mensajeElement = document.getElementById('mensaje');
const tamañoInput = document.getElementById('tamañoTablero');
const minasInput = document.getElementById('cantidadMinas');

// --- Game Initialization ---

function iniciarJuego() {
  // Read and validate user input
  tamañoTableroUsuario = parseInt(tamañoInput.value, 10);
  cantidadMinasUsuario = parseInt(minasInput.value, 10);

  // Clamp values to reasonable limits
  tamañoTableroUsuario = Math.max(5, Math.min(tamañoTableroUsuario, 25));
  cantidadMinasUsuario = Math.max(1, Math.min(cantidadMinasUsuario, tamañoTableroUsuario * tamañoTableroUsuario - 1)); // Ensure at least one safe cell

  // Update input fields with clamped values
  tamañoInput.value = tamañoTableroUsuario;
  minasInput.value = cantidadMinasUsuario;

  // Reset game state
  juegoTerminado = false;
  celdasCubiertas = tamañoTableroUsuario * tamañoTableroUsuario;
  banderasColocadas = 0; // Reset flag counter
  mensajeElement.textContent = "";
  mensajeElement.className = ""; // Clear message styles
  mensajeElement.style.display = 'none';

  clearInterval(timerInterval); // Stop any previous timer
  tiempoTranscurrido = 0;
  clicsIzquierdos = 0;
  clicsDerechos = 0;
  document.getElementById('tiempo-transcurrido').textContent = Math.round(tiempoTranscurrido);
  document.getElementById('minas-totales').textContent = cantidadMinasUsuario;
  document.getElementById('banderas-restantes').textContent = banderasColocadas;
  // Start new timer
  timerInterval = setInterval(() => {
    tiempoTranscurrido += 0.1;
    document.getElementById('tiempo-transcurrido').textContent = Math.round(tiempoTranscurrido);
  }, 100);

  // Create the internal board logic
  tablero = crearTablero(tamañoTableroUsuario, cantidadMinasUsuario);
  // Render the visual board
  dibujarTablero();
}

function crearTablero(tamaño, minas) {
  // Initialize an empty board (2D array) filled with 0
  const nuevoTablero = Array(tamaño).fill(null).map(() => Array(tamaño).fill(0));
  // Place mines randomly
  colocarMinas(nuevoTablero, minas);
  // Calculate adjacent mine counts for non-mine cells
  contarMinasAdyacentes(nuevoTablero);
  return nuevoTablero;
}

function colocarMinas(board, cantidad) {
  let minasColocadas = 0;
  const tamaño = board.length;
  while (minasColocadas < cantidad) {
    const fila = Math.floor(Math.random() * tamaño);
    const columna = Math.floor(Math.random() * tamaño);
    // Place a mine ('M') only if the cell is currently empty (0)
    if (board[fila][columna] === 0) {
      board[fila][columna] = 'M';
      minasColocadas++;
    }
  }
}

function contarMinasAdyacentes(board) {
  const tamaño = board.length;
  for (let fila = 0; fila < tamaño; fila++) {
    for (let columna = 0; columna < tamaño; columna++) {
      // Skip if the cell itself is a mine
      if (board[fila][columna] === 'M') continue;

      let conteoMinas = 0;
      // Iterate through all 8 neighbors
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue; // Skip the cell itself
          const nuevaFila = fila + i;
          const nuevaColumna = columna + j;
          // Check if the neighbor is within bounds
          if (nuevaFila >= 0 && nuevaFila < tamaño && nuevaColumna >= 0 && nuevaColumna < tamaño) {
            // If the neighbor is a mine, increment the count
            if (board[nuevaFila][nuevaColumna] === 'M') {
              conteoMinas++;
            }
          }
        }
      }
      // Assign the count to the cell if it's greater than 0
      if (conteoMinas > 0) {
        board[fila][columna] = conteoMinas;
      }
    }
  }
}

// --- Rendering and UI ---

function dibujarTablero() {
  tableroElement.innerHTML = ''; // Clear previous board
  // Set grid layout based on board size
  tableroElement.style.gridTemplateColumns = `repeat(${tamañoTableroUsuario}, 1fr)`;
  tableroElement.style.width = `${tamañoTableroUsuario * 37}px`; // Adjust width based on cell size + gap

  for (let fila = 0; fila < tamañoTableroUsuario; fila++) {
    for (let columna = 0; columna < tamañoTableroUsuario; columna++) {
      const celdaElement = document.createElement('div');
      celdaElement.classList.add('celda', 'celda-cubierta');
      // Store cell coordinates using data attributes
      celdaElement.dataset.fila = fila;
      celdaElement.dataset.columna = columna;

      // Left-click handler
      celdaElement.addEventListener('click', function (e) {
        if (juegoTerminado) return;
        clicsIzquierdos++;
        revelarCelda(fila, columna, celdaElement);
      });

      // Right-click handler (for flags)
      celdaElement.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // Prevent default context menu
        if (juegoTerminado || celdaElement.classList.contains('celda-revelada')) return; // Ignore on revealed or finished game
        clicsDerechos++;
        marcarBandera(fila, columna, celdaElement);
      });

      tableroElement.appendChild(celdaElement);
    }
  }
}

function obtenerCeldaElemento(fila, columna) {
  // Helper function to get the DOM element for a cell
  // Returns null if not found
  return tableroElement.querySelector(`.celda[data-fila="${fila}"][data-columna="${columna}"]`);
}

// --- Game Logic (Recursive Reveal) ---

function revelarCelda(fila, columna, celdaElement) {
  // Initial checks before starting reveal process
  if (juegoTerminado || !celdaElement || !celdaElement.classList.contains('celda-cubierta') || celdaElement.classList.contains('bandera')) {
    return; // Ignore clicks on flagged, revealed, invalid cells or if game over
  }

  const celdaValor = tablero[fila][columna];

  if (celdaValor === 'M') {
    // Clicked directly on a mine - Game Over
    celdaElement.classList.remove('celda-cubierta');
    celdaElement.classList.add('celda-revelada', 'mina');
    celdaElement.innerHTML = '💣';
    celdasCubiertas--; // Decrement for the revealed mine cell
    perderJuego(celdaElement);
  } else if (typeof celdaValor === 'number' && celdaValor > 0) {
    // Clicked directly on a numbered cell - Reveal only this cell
    celdaElement.classList.remove('celda-cubierta');
    celdaElement.classList.add('celda-revelada');
    celdaElement.textContent = celdaValor;
    celdaElement.classList.add(`numero-${celdaValor}`);
    celdasCubiertas--;
    verificarVictoria(); // Check win after revealing a number
  } else if (celdaValor === 0) {
    // Clicked on an empty cell (0) - Start recursive reveal
    const visitados = new Set(); // Create a new set to track visited cells *for this specific reveal operation*
    revelarCeldaRecursivo(fila, columna, visitados);
    // Win check might happen inside recursion, but check again afterwards
    verificarVictoria();
  }
}

function revelarCeldaRecursivo(fila, columna, visitados) {
  const tamaño = tablero.length;
  const key = `${fila}-${columna}`; // Unique key for the visited set

  // --- Base Cases (Conditions to stop recursion for this path) ---

  // 1. Out of bounds
  if (fila < 0 || fila >= tamaño || columna < 0 || columna >= tamaño) {
    return;
  }

  // 2. Already visited in *this specific recursive operation* (prevents infinite loops)
  if (visitados.has(key)) {
    return;
  }

  // 3. Cell element doesn't exist or is NOT covered (i.e., already revealed or flagged)
  const celdaElement = obtenerCeldaElemento(fila, columna);
  if (!celdaElement || !celdaElement.classList.contains('celda-cubierta')) {
    return;
  }

  // --- Process the Current Cell ---
  visitados.add(key); // Mark as visited for this operation *before* revealing

  // Reveal the cell visually
  celdaElement.classList.remove('celda-cubierta');
  celdaElement.classList.add('celda-revelada');
  if (celdaElement.classList.contains('bandera')) {
    // If it was incorrectly flagged, remove flag visual and adjust counter
    celdaElement.classList.remove('bandera');
    celdaElement.innerHTML = '';
    banderasColocadas--;
  }
  celdasCubiertas--; // Decrement remaining covered cells count

  const celdaValor = tablero[fila][columna]; // Get value from internal board

  // Check for win condition AFTER revealing this cell
  if (verificarVictoria()) {
    return; // Stop all recursion if game is won
  }

  // --- Decide whether to continue recursion ---

  if (typeof celdaValor === 'number' && celdaValor > 0) {
    // It's a numbered cell, display the number and stop recursion for this path
    celdaElement.textContent = celdaValor;
    celdaElement.classList.add(`numero-${celdaValor}`);
    return; // Stop exploring further from this numbered cell
  } else if (celdaValor === 0) {
    // It's a zero cell, recursively call for all 8 neighbors
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        // Skip self (though base cases would handle it, this is clearer)
        // if (i === 0 && j === 0) continue; // Not strictly needed due to base cases

        // IMPORTANT: Check if game ended during a nested recursive call
        if (juegoTerminado) return;

        revelarCeldaRecursivo(fila + i, columna + j, visitados);
      }
    }
  }
  // Note: If celdaValor is 'M', this function shouldn't be called initially.
  // The initial click on 'M' is handled in revelarCelda.
}


function marcarBandera(fila, columna, celdaElement) {
  if (celdaElement.classList.contains('bandera')) {
    // Remove flag
    celdaElement.classList.remove('bandera');
    celdaElement.innerHTML = ''; // Clear flag emoji
    banderasColocadas--;
  } else {
    // Add flag
    celdaElement.classList.add('bandera');
    celdaElement.innerHTML = '🚩'; // Use flag emoji
    banderasColocadas++;
  }
  document.getElementById('banderas-restantes').textContent = banderasColocadas;
  // Optional: Update UI element showing flags placed vs mines total
  // console.log(`Banderas: ${banderasColocadas}/${cantidadMinasUsuario}`);
}

// --- Win/Loss Conditions ---

// Checks for win condition and returns true if won, false otherwise
function verificarVictoria() {
  if (!juegoTerminado && celdasCubiertas === cantidadMinasUsuario) {
    ganarJuego();
    return true; // Game is won
  }
  return false; // Game continues
}

function ganarJuego() {
  if (juegoTerminado) return; // Prevent running multiple times
  juegoTerminado = true;
  clearInterval(timerInterval);
  mostrarMinasGanador();
  mostrarMensajeVictoria();
}

function perderJuego(celdaExplotada) {
  if (juegoTerminado) return; // Prevent running multiple times
  clearInterval(timerInterval); // Stop the timer on loss
  mensajeElement.textContent = "¡BOOM! ¡Has perdido!";
  mensajeElement.className = 'mensaje-perdedor'; // Add lose style
  mensajeElement.style.display = 'block';
  juegoTerminado = true;
  mostrarTodasMinas(celdaExplotada); // Reveal all mines
}


function mostrarTodasMinas(celdaExplotada) {
  const tamaño = tablero.length;
  for (let fila = 0; fila < tamaño; fila++) {
    for (let columna = 0; columna < tamaño; columna++) {
      const celdaElement = obtenerCeldaElemento(fila, columna);
      if (!celdaElement) continue;

      const esMina = tablero[fila][columna] === 'M';
      const tieneBandera = celdaElement.classList.contains('bandera');

      if (esMina && !tieneBandera) {
        // Reveal mines that weren't flagged
        celdaElement.classList.remove('celda-cubierta', 'bandera');
        celdaElement.classList.add('celda-revelada', 'mina');
        celdaElement.innerHTML = '💣';
        // Highlight the specific mine clicked that caused loss
        if (celdaElement === celdaExplotada) {
          celdaElement.style.backgroundColor = '#c0392b'; // Darker red
        }
      } else if (!esMina && tieneBandera) {
        // Indicate incorrectly placed flags
        celdaElement.innerHTML = '❌'; // Show cross on wrong flags
        celdaElement.classList.remove('bandera'); // Optional: remove flag class
        celdaElement.classList.add('celda-revelada'); // Make sure background matches revealed cells
        // celdaElement.style.backgroundColor = '#f39c12'; // Optional: Orange background for wrong flag
      } else if (esMina && tieneBandera) {
        // Optional: Style correctly placed flags differently on loss?
        // celdaElement.style.backgroundColor = '#27ae60'; // Green maybe?
      }
    }
  }
}

// Optional: Show flags on remaining mines when winning
function mostrarMinasGanador() {
  const tamaño = tablero.length;
  for (let fila = 0; fila < tamaño; fila++) {
    for (let columna = 0; columna < tamaño; columna++) {
      const celdaElement = obtenerCeldaElemento(fila, columna);
      if (!celdaElement) continue;

      if (tablero[fila][columna] === 'M') {
        if (celdaElement.classList.contains('celda-cubierta')) { // Only affect covered mines
          celdaElement.classList.remove('celda-cubierta');
          celdaElement.classList.add('celda-revelada'); // Reveal them
          if (!celdaElement.classList.contains('bandera')) {
            // Automatically flag unflagged mines for the winner
            celdaElement.classList.add('bandera');
            celdaElement.innerHTML = '🚩';
          }
          // Optional: Add a winning style to correctly flagged mines
          celdaElement.style.backgroundColor = '#27ae60'; // Green background
        }
      }
    }
  }
}

// Calculate 3BV: flood-fill zero regions and count isolated numbers
function calcular3BV(board) {
  const n = board.length;
  const visited = new Set();
  let bv = 0;
  function floodZero(i, j) {
    const stack = [[i, j]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const key = `${x}-${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < n && ny >= 0 && ny < n && board[nx][ny] === 0) {
            const nk = `${nx}-${ny}`;
            if (!visited.has(nk)) stack.push([nx, ny]);
          }
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = board[i][j];
      if (val === 0) {
        const key = `${i}-${j}`;
        if (!visited.has(key)) {
          bv++;
          floodZero(i, j);
        }
      } else if (typeof val === 'number' && val > 0) {
        // Count numbers without adjacent zero
        let hasZero = false;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const nx = i + dx, ny = j + dy;
          if (nx >= 0 && nx < n && ny >= 0 && ny < n && board[nx][ny] === 0) {
            hasZero = true;
          }
        }
        if (!hasZero) bv++;
      }
    }
  }
  return bv;
}

function mostrarMensajeVictoria() {
  const mensajeDiv = document.getElementById('mensaje');
  mensajeDiv.className = 'mensaje-ganador';
  mensajeDiv.style.display = 'block';
  const tiempo = tiempoTranscurrido;
  const tresBV = calcular3BV(tablero);
  const tresBVs = (tresBV / tiempo).toFixed(4);
  const totalClics = clicsIzquierdos + clicsDerechos;
  const eficiencia = ((tresBV / totalClics) * 100).toFixed(0);
  mensajeDiv.innerHTML = `
    <h2>¡Felicidades! ¡Has ganado!</h2>
    <ul>
      <li>Tiempo: ${Math.round(tiempo)} seg</li>
      <li>3BV: ${tresBV}</li>
      <li>3BV/s: ${tresBVs}</li>
      <li>Clics: ${clicsIzquierdos}+${clicsDerechos} (${totalClics})</li>
      <li>Eficiencia: ${eficiencia}%</li>
    </ul>
  `;
}

// --- Initial Load ---
// Start the game for the first time when the page loads
window.onload = iniciarJuego;
