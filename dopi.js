/* =========================================================
   DOPI — componente SVG reutilizable (sin dependencias)
   Uso:
     el.innerHTML = Dopi.svg({ stage: 4, mood: 'happy', mix: .7, share: .5,
                               hat: 'beanie', face: 'none', neck: 'scarf' });
     Dopi.set(el.querySelector('.dopi'), { mood: 'eat' });   // cambia en caliente
     Dopi.flash(svgEl, 'eat', 2400);   // estado temporal y vuelve al anterior
     Dopi.react(svgEl, 'photo');       // reacción de 1,6 s (poke | photo)
   Requiere dopi.css cargado en la página.
   ========================================================= */
(function (root) {
  'use strict';

  var HEART = 'M0 6C-7 1-9-3-7-6C-5-9-1-8 0-5C1-8 5-9 7-6C9-3 7 1 0 6Z';
  var SPARK = 'M0-8Q1.5-1.5 8 0Q1.5 1.5 0 8Q-1.5 1.5-8 0Q-1.5-1.5 0-8Z';
  var ZED = 'M-5-6h10l-10 12h10';

  function at(x, y, inner) { return '<g transform="translate(' + x + ' ' + y + ')">' + inner + '</g>'; }

  var MARKUP = [
    // ---------- fondo: aura (etapa 5) y sombra ----------
    '<circle class="d-aura only-5" cx="100" cy="112" r="86"/>',
    '<ellipse class="d-shadow" cx="100" cy="185" rx="48" ry="7"/>',
    '<g class="d-rig"><g class="d-scale">',

    // ---------- etapa 1: huevo ----------
    '<g class="only-1">',
      '<path class="d-egg ln" d="M100 34C138 34 160 96 160 128C160 162 134 182 100 182C66 182 40 162 40 128C40 96 62 34 100 34Z"/>',
      '<path class="d-shade" d="M46 142C54 166 76 178 100 178C124 178 146 166 154 142C150 164 128 174 100 174C72 174 50 164 46 142Z"/>',
      '<ellipse class="d-shine" cx="72" cy="66" rx="10" ry="6" transform="rotate(-40 72 66)"/>',
      '<path class="d-crack" d="M44 140L58 132L70 144L84 132L100 144L116 132L130 144L142 132L156 140"/>',
      '<circle class="c-a" cx="70" cy="160" r="6"/><circle class="c-b" cx="132" cy="158" r="5"/>',
      '<circle class="c-b" cx="90" cy="172" r="3.5"/><circle class="c-a" cx="114" cy="170" r="3.5"/>',
    '</g>',

    // ---------- etapas 2-5: cuerpo ----------
    '<g class="from-2">',
      '<g class="d-arm d-arm-l from-3"><ellipse class="d-limb ln" cx="38" cy="136" rx="9" ry="15"/></g>',
      '<g class="d-arm d-arm-r from-3"><ellipse class="d-limb ln" cx="162" cy="136" rx="9" ry="15"/></g>',
      '<ellipse class="d-limb ln" cx="78" cy="177" rx="15" ry="7.5"/>',
      '<ellipse class="d-limb ln" cx="122" cy="177" rx="15" ry="7.5"/>',
      '<path class="d-body ln" d="M100 52C146 52 162 90 162 126C162 160 136 178 100 178C64 178 38 160 38 126C38 90 54 52 100 52Z"/>',
      '<path class="d-shade" d="M44 138C52 164 76 174 100 174C124 174 148 164 156 138C150 160 128 170 100 170C72 170 50 160 44 138Z"/>',
      '<ellipse class="d-shine" cx="68" cy="78" rx="11" ry="6" transform="rotate(-32 68 78)"/>',
      '<g class="only-5"><circle class="d-freckle" cx="56" cy="102" r="1.8"/><circle class="d-freckle" cx="62" cy="96" r="1.4"/><circle class="d-freckle" cx="144" cy="102" r="1.8"/><circle class="d-freckle" cx="138" cy="96" r="1.4"/></g>',
      '<g class="d-belly from-4"><circle class="d-belly-a" cx="100" cy="157" r="8"/><circle class="d-belly-b" cx="100" cy="157" r="8"/></g>',
    '</g>',

    // ---------- brote / corazón de la cabeza ----------
    '<g class="d-tuft from-2">',
      '<path class="d-stem s23" d="M100 54C100 48 100 45 101 41"/>',
      '<path class="d-leaf d-leaf-l ln-thin s23" d="M100 42C92 43 84 38 81 29C91 28 98 33 100 42Z"/>',
      '<path class="d-leaf d-leaf-r ln-thin only-3" d="M101 42C109 43 117 38 120 29C110 28 103 33 101 42Z"/>',
      '<g class="d-heart from-4">',
        '<path class="d-heart-l ln-thin" d="M100 50C92 44 84 38 85 30C86 23 95 22 100 29Z"/>',
        '<path class="d-heart-r ln-thin" d="M100 50C108 44 116 38 115 30C114 23 105 22 100 29Z"/>',
      '</g>',
    '</g>',

    // ---------- mejillas: izquierda Abdu, derecha Alba ----------
    '<g class="d-cheeks"><ellipse class="d-cheek c-a" cx="64" cy="116" rx="9" ry="5.5"/><ellipse class="d-cheek c-b" cx="136" cy="116" rx="9" ry="5.5"/></g>',

    // ---------- CARAS ----------
    // contento
    '<g class="m-happy"><g class="d-blink">',
      '<ellipse class="d-eye" cx="78" cy="98" rx="6" ry="8"/><ellipse class="d-eye" cx="122" cy="98" rx="6" ry="8"/>',
      '<circle class="d-glint" cx="80.5" cy="94" r="2.2"/><circle class="d-glint" cx="124.5" cy="94" r="2.2"/></g>',
      '<path class="d-mouth" d="M90 118Q100 128 110 118"/></g>',
    // hambriento
    '<g class="m-hungry"><g class="d-blink">',
      '<ellipse class="d-eye" cx="78" cy="97" rx="7" ry="9"/><ellipse class="d-eye" cx="122" cy="97" rx="7" ry="9"/>',
      '<circle class="d-glint" cx="80" cy="91" r="3"/><circle class="d-glint" cx="124" cy="91" r="3"/>',
      '<circle class="d-glint" cx="76" cy="101" r="1.4"/><circle class="d-glint" cx="120" cy="101" r="1.4"/></g>',
      '<ellipse class="d-mouth-in" cx="100" cy="123" rx="6" ry="6.5"/>',
      '<path class="d-drool" d="M106 127Q109 134 106 139Q103 134 106 127Z"/></g>',
    // cansado / durmiendo
    '<g class="m-sleepy">',
      '<path class="d-mouth" d="M71 99Q78 105 85 99"/><path class="d-mouth" d="M115 99Q122 105 129 99"/>',
      '<ellipse class="d-mouth-in d-snore" cx="100" cy="122" rx="3.5" ry="4.5"/></g>',
    // triste / solo
    '<g class="m-sad">',
      '<path class="d-mouth" d="M69 86L85 81"/><path class="d-mouth" d="M115 81L131 86"/>',
      '<g class="d-blink"><ellipse class="d-eye" cx="78" cy="100" rx="5.5" ry="6.5"/><ellipse class="d-eye" cx="122" cy="100" rx="5.5" ry="6.5"/>',
      '<circle class="d-glint" cx="80" cy="97" r="2"/><circle class="d-glint" cx="124" cy="97" r="2"/></g>',
      '<path class="d-tear" d="M129 106Q133 114 129 118Q125 114 129 106Z"/>',
      '<path class="d-mouth" d="M91 126Q100 118 109 126"/></g>',
    // enamorado (un ojo de cada color)
    '<g class="m-love">',
      '<path class="d-eyeheart-a" d="M78 106C70 100 66 95 68 91C70 87 76 87 78 92C80 87 86 87 88 91C90 95 86 100 78 106Z"/>',
      '<path class="d-eyeheart-b" d="M122 106C114 100 110 95 112 91C114 87 120 87 122 92C124 87 130 87 132 91C134 95 130 100 122 106Z"/>',
      '<path class="d-mouth" d="M88 118Q100 131 112 118"/></g>',
    // enfermo / apagado
    '<g class="m-sick">',
      '<path class="d-mouth" d="M70 97L86 97"/><path class="d-mouth" d="M114 97L130 97"/>',
      '<path class="d-eye" d="M72 98A6 6 0 0 0 84 98Z"/><path class="d-eye" d="M116 98A6 6 0 0 0 128 98Z"/>',
      '<path class="d-mouth" d="M88 124Q92 120 96 124Q100 128 104 124Q108 120 112 124"/>',
      '<g class="d-bandage" transform="rotate(30 136 70)"><rect x="124" y="65" width="24" height="10" rx="5"/><rect class="d-bandage-pad" x="132" y="65" width="8" height="10"/></g></g>',
    // comiendo
    '<g class="m-eat">',
      '<path class="d-mouth" d="M71 100Q78 92 85 100"/><path class="d-mouth" d="M115 100Q122 92 129 100"/>',
      '<ellipse class="d-mouth-in d-chomp" cx="100" cy="122" rx="7" ry="6"/></g>',
    // jugando (guiño)
    '<g class="m-play">',
      '<path class="d-mouth" d="M71 99Q78 93 85 99"/>',
      '<ellipse class="d-eye" cx="122" cy="97" rx="6.5" ry="8.5"/><circle class="d-glint" cx="124.5" cy="93" r="2.4"/>',
      '<path class="d-mouth-in" d="M88 117Q100 134 112 117Z"/><path class="d-tongue" d="M95 123Q100 129 105 123Q100 120 95 123Z"/></g>',
    // recibiendo caricias
    '<g class="m-pet">',
      '<path class="d-mouth" d="M71 100Q78 93 85 100"/><path class="d-mouth" d="M115 100Q122 93 129 100"/>',
      '<path class="d-mouth" d="M90 119Q95 124 100 120Q105 124 110 119"/>',
      '<path class="d-blush" d="M58 112l-3 6M64 112l-3 6M70 112l-3 6M132 112l-3 6M138 112l-3 6M144 112l-3 6"/></g>',
    // celebrando
    '<g class="m-party">',
      '<path class="d-star" d="M78 87Q80 96 89 98Q80 100 78 109Q76 100 67 98Q76 96 78 87Z"/>',
      '<path class="d-star" d="M122 87Q124 96 133 98Q124 100 122 109Q120 100 111 98Q120 96 122 87Z"/>',
      '<path class="d-mouth-in" d="M86 116Q100 138 114 116Z"/><path class="d-tongue" d="M94 124Q100 131 106 124Q100 121 94 124Z"/></g>',

    // ---------- ACCESORIOS: cabeza ----------
    '<g class="acc a-hat-beanie"><path class="a-pink ln" d="M58 74C58 38 142 38 142 74Z"/><path class="a-stripe-w" d="M76 50L80 70M100 44V70M124 50L120 70"/><rect class="a-teal ln" x="54" y="68" width="92" height="14" rx="7"/><circle class="a-teal ln" cx="100" cy="36" r="8"/></g>',
    '<g class="acc a-hat-beret"><ellipse class="a-wine ln" cx="94" cy="60" rx="48" ry="14" transform="rotate(-9 94 60)"/><path class="a-wire" d="M96 47L99 38"/></g>',
    '<g class="acc a-hat-cap"><path class="a-teal ln" d="M60 74C60 42 140 42 140 74Z"/><path class="a-teal ln" d="M130 70C148 66 168 68 172 76C160 80 142 80 130 77Z"/><circle class="a-pink" cx="100" cy="46" r="4.5"/></g>',
    '<g class="acc a-hat-crown"><path class="a-gold ln" d="M74 60L72 32L88 46L100 26L112 46L128 32L126 60Z"/><circle class="c-a" cx="88" cy="53" r="3.2"/><circle class="c-b" cx="112" cy="53" r="3.2"/><circle class="a-cream" cx="100" cy="51" r="3.6"/></g>',
    '<g class="acc a-hat-flowers"><path class="a-band" d="M58 74Q100 48 142 74"/>',
      at(66, 66, '<circle class="a-pink ln-thin" r="7"/><circle class="a-gold" r="2.6"/>'),
      at(84, 57, '<circle class="a-teal ln-thin" r="6"/><circle class="a-gold" r="2.3"/>'),
      at(116, 57, '<circle class="a-pink ln-thin" r="6"/><circle class="a-gold" r="2.3"/>'),
      at(134, 66, '<circle class="a-teal ln-thin" r="7"/><circle class="a-gold" r="2.6"/>'),
    '</g>',
    '<g class="acc a-hat-horns"><path class="a-horn ln" d="M70 66C62 56 62 44 68 36C71 47 77 54 86 58Z"/><path class="a-horn ln" d="M130 66C138 56 138 44 132 36C129 47 123 54 114 58Z"/></g>',
    '<g class="acc a-hat-party" transform="rotate(12 104 40)"><path class="a-pink ln" d="M84 58L104 12L124 58Z"/><path class="a-stripe-b" d="M93 40L115 40M99 26L109 26"/><circle class="a-gold ln" cx="104" cy="12" r="6"/></g>',

    // ---------- ACCESORIOS: cara ----------
    '<g class="acc a-face-round"><circle class="a-lens ln" cx="78" cy="98" r="14"/><circle class="a-lens ln" cx="122" cy="98" r="14"/><path class="a-wire" d="M92 97Q100 91 108 97M64 95L48 90M136 95L152 90"/></g>',
    '<g class="acc a-face-hearts"><path class="a-sun ln-thin" d="M78 113C63 105 59 96 61 90C63 82 74 81 78 89C82 81 93 82 95 90C97 96 93 105 78 113Z"/><path class="a-sun ln-thin" d="M122 113C107 105 103 96 105 90C107 82 118 81 122 89C126 81 137 82 139 90C141 96 137 105 122 113Z"/><path class="a-wire" d="M95 92Q100 89 105 92"/><path class="a-stripe-w" d="M68 90L72 87M112 90L116 87"/></g>',
    '<g class="acc a-face-stache"><path class="a-dark" d="M100 113C94 107 83 107 78 115C86 113 92 117 100 117C108 117 114 113 122 115C117 107 106 107 100 113Z"/></g>',

    // ---------- ACCESORIOS: cuello ----------
    '<g class="acc a-neck-scarf"><path class="a-pink ln" d="M46 134Q100 158 154 134L156 148Q100 172 44 148Z"/><path class="a-stripe-b" d="M64 143L62 154M84 149L83 160M116 149L117 160M136 143L138 154"/><path class="a-pink ln" d="M126 152L140 180L124 182L116 156Z"/></g>',
    '<g class="acc a-neck-bowtie"><path class="a-teal ln" d="M100 141L80 130L80 152Z"/><path class="a-teal ln" d="M100 141L120 130L120 152Z"/><circle class="a-pink ln" cx="100" cy="141" r="5.5"/></g>',
    '<g class="acc a-neck-collar"><path class="a-collar" d="M52 134Q100 156 148 134"/>',
      at(100, 152, '<path class="a-gold ln-thin" transform="scale(1.3)" d="' + HEART + '"/>'),
    '</g>',
    '<g class="acc a-neck-bandana"><path class="a-teal ln" d="M48 134Q100 152 152 134L100 172Z"/><circle class="a-cream" cx="88" cy="148" r="2.5"/><circle class="a-cream" cx="112" cy="148" r="2.5"/><circle class="a-cream" cx="100" cy="160" r="2.5"/></g>',

    '</g></g>', // fin d-scale, d-rig

    // ---------- ÓRBITA etapa 5 ----------
    '<g class="only-5">',
      '<g class="d-orbit-a"><g class="d-orbit-x"><g class="d-orbit-y"><circle class="d-orb-a" cx="100" cy="118" r="6"/></g></g></g>',
      '<g class="d-orbit-b"><g class="d-orbit-x"><g class="d-orbit-y"><circle class="d-orb-b" cx="100" cy="118" r="6"/></g></g></g>',
    '</g>',

    // ---------- PARTÍCULAS por estado ----------
    '<g class="fx">',
      // contento: destello suelto
      '<g class="m-happy">', at(158, 58, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'), at(42, 74, '<path class="fx-spark fx-twinkle dl2" transform="scale(.6)" d="' + SPARK + '"/>'), '</g>',
      // hambriento: bocadillo con galleta + tripa que ruge
      '<g class="m-hungry">',
        '<circle class="fx-bub" cx="146" cy="64" r="3"/><circle class="fx-bub" cx="154" cy="52" r="5"/>',
        '<ellipse class="fx-bub" cx="172" cy="30" rx="19" ry="15"/>',
        '<circle class="fx-cookie" cx="172" cy="30" r="9"/><circle class="fx-chip" cx="169" cy="27" r="1.7"/><circle class="fx-chip" cx="175" cy="33" r="1.7"/><circle class="fx-chip" cx="174" cy="26" r="1.3"/>',
        '<path class="fx-rumble fx-twinkle" d="M30 148l-9-2M28 156h-10M30 164l-9 2"/>',
        '<path class="fx-rumble fx-twinkle dl1" d="M170 148l9-2M172 156h10M170 164l9 2"/>',
      '</g>',
      // durmiendo: zetas
      '<g class="m-sleepy">', at(148, 66, '<path class="fx-z fx-float" d="' + ZED + '"/>'), at(158, 50, '<path class="fx-z fx-float dl2" transform="scale(1.3)" d="' + ZED + '"/>'), at(168, 32, '<path class="fx-z fx-float dl3" transform="scale(1.6)" d="' + ZED + '"/>'), '</g>',
      // triste: nubecita
      '<g class="m-sad">',
        '<g class="fx-twinkle"><ellipse class="fx-cloud" cx="160" cy="40" rx="18" ry="10"/><circle class="fx-cloud" cx="152" cy="34" r="9"/><circle class="fx-cloud" cx="166" cy="32" r="10"/></g>',
        at(154, 56, '<path class="fx-drop fx-fall" d="M0-4Q3 1 0 3Q-3 1 0-4Z"/>'), at(166, 56, '<path class="fx-drop fx-fall dl1" d="M0-4Q3 1 0 3Q-3 1 0-4Z"/>'),
      '</g>',
      // enamorado: corazones rosa y teal
      '<g class="m-love">', at(40, 92, '<path class="fx-heart-a fx-rise" d="' + HEART + '"/>'), at(162, 84, '<path class="fx-heart-b fx-rise dl1" transform="scale(1.2)" d="' + HEART + '"/>'), at(150, 44, '<path class="fx-heart-a fx-rise dl2" transform="scale(.8)" d="' + HEART + '"/>'), at(54, 50, '<path class="fx-heart-b fx-rise dl3" transform="scale(.9)" d="' + HEART + '"/>'), '</g>',
      // enfermo: nube mareada
      '<g class="m-sick">', '<ellipse class="fx-sick" cx="160" cy="40" rx="16" ry="9"/><circle class="fx-sick" cx="152" cy="34" r="8"/><circle class="fx-sick" cx="166" cy="33" r="8"/>', '<path class="fx-swirl" d="M156 40a4 4 0 1 1 6 0a7 7 0 1 1-10-2"/>', '</g>',
      // comiendo: galleta mordida + migas
      '<g class="m-eat">',
        '<path class="fx-cookie" d="M150 120a14 14 0 1 0 2 14a5 5 0 0 1-4-6a5 5 0 0 1 2-8Z"/>',
        '<circle class="fx-chip" cx="142" cy="128" r="2"/><circle class="fx-chip" cx="148" cy="138" r="1.7"/>',
        at(118, 140, '<circle class="fx-crumb fx-fall" r="2.2"/>'), at(126, 136, '<circle class="fx-crumb fx-fall dl1" r="1.8"/>'), at(110, 142, '<circle class="fx-crumb fx-fall dl2" r="1.6"/>'),
      '</g>',
      // jugando: pelota de los dos colores
      '<g class="m-play"><g class="fx-bounce">', '<circle class="fx-heart-a" cx="176" cy="166" r="12"/><path class="fx-heart-b" d="M164 166a12 12 0 0 0 24 0Z"/><circle class="fx-ball-line" cx="176" cy="166" r="12"/>', '</g></g>',
      // caricias: destellos y corazoncitos
      '<g class="m-pet">', at(36, 80, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'), at(164, 70, '<path class="fx-spark fx-twinkle dl1" d="' + SPARK + '"/>'), at(100, 22, '<path class="fx-heart-a fx-rise" transform="scale(.9)" d="' + HEART + '"/>'), at(118, 28, '<path class="fx-heart-b fx-rise dl2" transform="scale(.7)" d="' + HEART + '"/>'), '</g>',
      // celebrando: confeti
      '<g class="m-party">',
        at(40, 30, '<rect class="fx-conf-a fx-fall" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(70, 18, '<rect class="fx-conf-b fx-fall dl1" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(130, 16, '<rect class="fx-conf-g fx-fall dl2" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(162, 30, '<rect class="fx-conf-a fx-fall dl3" x="-3" y="-5" width="6" height="10" rx="1"/>'),
        at(24, 70, '<path class="fx-spark fx-twinkle" d="' + SPARK + '"/>'),
        at(178, 76, '<path class="fx-spark fx-twinkle dl1" d="' + SPARK + '"/>'),
        at(150, 20, '<circle class="fx-conf-b fx-fall dl1" r="3"/>'),
        at(52, 22, '<circle class="fx-conf-g fx-fall dl3" r="3"/>'),
      '</g>',
      // reacción: poke recibido
      '<g class="r-poke"><circle class="fx-poke" cx="160" cy="48" r="14"/><rect class="fx-poke-mark" x="158" y="38" width="4" height="12" rx="2"/><circle class="fx-poke-mark" cx="160" cy="55" r="2.4"/></g>',
      // reacción: llega el check de fotos (polaroid que cae)
      '<g class="r-photo"><g class="fx-drop-in"><rect class="fx-photo-card" x="146" y="22" width="40" height="46" rx="3"/><rect class="fx-photo-img" x="151" y="27" width="30" height="28"/><circle class="fx-photo-sun" cx="173" cy="34" r="4"/><path class="fx-photo-hill" d="M151 55L162 42L170 50L176 45L181 55Z"/></g></g>',
    '</g>'
  ].join('');

  var MOODS = ['happy', 'hungry', 'sleepy', 'sad', 'love', 'sick', 'eat', 'play', 'pet', 'party'];
  var MOOD_LABEL = { happy: 'contenta', hungry: 'con hambre', sleepy: 'durmiendo', sad: 'echándoos de menos', love: 'enamorada', sick: 'apagada', eat: 'comiendo', play: 'jugando', pet: 'recibiendo mimos', party: 'celebrando' };
  var STAGES = [null, 'Huevo', 'Cría', 'Joven', 'Adulta', 'Alma gemela'];

  function svg(o) {
    o = o || {};
    var stage = o.stage || 1, mood = o.mood || 'happy';
    var mix = o.mix == null ? 0.5 : o.mix, share = o.share == null ? 0.5 : o.share;
    var label = 'Dopi, ' + STAGES[stage] + ', ' + (MOOD_LABEL[mood] || mood);
    return '<svg class="dopi' + (o.still ? ' is-still' : '') + '" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"' +
      ' data-stage="' + stage + '" data-mood="' + mood + '"' +
      ' data-hat="' + (o.hat || 'none') + '" data-face="' + (o.face || 'none') + '" data-neck="' + (o.neck || 'none') + '"' +
      ' data-react="none" style="--mix:' + mix + ';--share:' + share + '" role="img" aria-label="' + label + '">' +
      MARKUP + '</svg>';
  }

  function set(el, o) {
    if (!el) return;
    ['stage', 'mood', 'hat', 'face', 'neck', 'react'].forEach(function (k) { if (o[k] != null) el.setAttribute('data-' + k, o[k]); });
    if (o.mix != null) el.style.setProperty('--mix', o.mix);
    if (o.share != null) el.style.setProperty('--share', o.share);
    var s = +el.getAttribute('data-stage'), m = el.getAttribute('data-mood');
    el.setAttribute('aria-label', 'Dopi, ' + STAGES[s] + ', ' + (MOOD_LABEL[m] || m));
  }

  // Estado temporal (acción) y vuelta al estado de fondo
  function flash(el, mood, ms) {
    if (!el) return;
    var base = el.getAttribute('data-base-mood') || el.getAttribute('data-mood');
    el.setAttribute('data-base-mood', base);
    set(el, { mood: mood });
    clearTimeout(el._dopiT);
    el._dopiT = setTimeout(function () { set(el, { mood: el.getAttribute('data-base-mood') }); el.removeAttribute('data-base-mood'); }, ms || 2400);
  }

  function react(el, kind, ms) {
    if (!el) return;
    set(el, { react: kind });
    clearTimeout(el._dopiR);
    el._dopiR = setTimeout(function () { set(el, { react: 'none' }); }, ms || 1600);
  }

  root.Dopi = { svg: svg, set: set, flash: flash, react: react, MOODS: MOODS, MOOD_LABEL: MOOD_LABEL, STAGES: STAGES, MARKUP: MARKUP };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Dopi;
})(typeof window !== 'undefined' ? window : globalThis);
