export const FILMS = {
  valorAnadido: [
    {
      title: "Persona",
      director: "Ingmar Bergman",
      note: "La ruptura entre sonido e imagen vuelve perceptible que la unidad audiovisual no es natural sino construida.",
    },
    {
      title: "Las vacaciones de M. Hulot",
      director: "Jacques Tati",
      note: "El sonido agrega juegos, ritmos y pequenas acciones que la imagen por si sola no termina de fijar.",
    },
    {
      title: "Apocalypse Now",
      director: "Francis Ford Coppola",
      note: "Helicopteros, musica y capas ambientales cargan la imagen de amenaza, escala y delirio belico.",
    },
  ],
  sincresis: [
    {
      title: "Playtime",
      director: "Jacques Tati",
      note: "La precision de gestos y ruidos permite componer gag, ritmo y sentido por sincronizacion.",
    },
    {
      title: "Apocalypse Now",
      director: "Francis Ford Coppola",
      note: "La union entre helices, ventilador y helicopteros crea pasajes mentales por soldadura audiovisual.",
    },
  ],
  acusmetro: [
    {
      title: "2001: Odisea del espacio",
      director: "Stanley Kubrick",
      note: "HAL 9000 funciona como voz distribuida, vigilante y sin cuerpo unico visible.",
    },
    {
      title: "Psicosis",
      director: "Alfred Hitchcock",
      note: "La voz de la madre sostiene una presencia invisible hasta su desacusmatizacion.",
    },
    {
      title: "El mago de Oz",
      director: "Victor Fleming",
      note: "El poder de la voz se reduce cuando se revela el dispositivo que la produce.",
    },
  ],
  puntoEscucha: [
    {
      title: "Apocalypse Now",
      director: "Francis Ford Coppola",
      note: "El inicio desplaza la escucha entre espacio fisico, recuerdo y estado mental de Willard.",
    },
    {
      title: "La ventana indiscreta",
      director: "Alfred Hitchcock",
      note: "El entorno sonoro ayuda a construir posiciones de escucha dentro del vecindario.",
    },
  ],
  fueraCampo: [
    {
      title: "La ventana indiscreta",
      director: "Alfred Hitchcock",
      note: "Voces, musica y ruidos amplian el espacio mas alla del departamento observado.",
    },
    {
      title: "Apocalypse Now",
      director: "Francis Ford Coppola",
      note: "La selva, las voces y los ataques invisibles hacen sentir amenaza fuera del encuadre.",
    },
  ],
  musicaAnempatica: [
    {
      title: "Psicosis",
      director: "Alfred Hitchcock",
      note: "La continuidad de ciertos sonidos despues de la violencia puede leerse como indiferencia del mundo.",
    },
    {
      title: "A Clockwork Orange",
      director: "Stanley Kubrick",
      note: "La musica puede producir distancia cruel cuando no acompana empaticamente la violencia.",
    },
  ],
};

export const FILM_ANALYSES = {
  apocalypseNow: {
    title: "Apocalypse Now",
    director: "Francis Ford Coppola",
    year: "1979",
    aliases: ["apocalypse now", "apocalipsis now"],
    sections: [
      {
        conceptKey: "valorAnadido",
        title: "VALOR AÑADIDO",
        body:
          "La banda sonora no ilustra la guerra: la agranda. Helicopteros, explosiones, motores, radio y musica agregan escala, amenaza y delirio a imagenes que de otro modo serian menos densas. La cabalgata de las valquirias no solo acompana el ataque; convierte la operacion militar en espectaculo, ritual y exceso.",
      },
      {
        conceptKey: "puntoEscucha",
        title: "PUNTO DE ESCUCHA",
        body:
          "El comienzo con Willard permite oir desde una zona inestable: habitacion, memoria, cuerpo intoxicado y recuerdo de combate. El ventilador puede transformarse perceptivamente en helicóptero porque la mezcla desplaza la escucha hacia el interior del personaje.",
      },
      {
        conceptKey: "fueraCampo",
        title: "FUERA DE CAMPO",
        body:
          "La selva existe muchas veces antes por el sonido que por la imagen. Insectos, voces lejanas, disparos, altavoces y movimientos invisibles expanden el encuadre y convierten el fuera de campo en amenaza permanente.",
      },
      {
        conceptKey: "sonidoInterno",
        title: "SONIDO INTERNO",
        body:
          "La pelicula trabaja el sonido como memoria y percepcion alterada. Ciertos pasajes no parecen organizar un espacio objetivo, sino un estado mental atravesado por trauma, espera y repeticion.",
      },
      {
        conceptKey: "musicaAnempatica",
        title: "MÚSICA EMPÁTICA / ANEMPÁTICA",
        body:
          "La musica puede empujar emocionalmente la escena, pero tambien producir distancia. Cuando una pieza reconocible se impone sobre la violencia, la pregunta no es solo que sentimos, sino que ideologia del espectaculo esta fabricando esa emocion.",
      },
    ],
  },
};
