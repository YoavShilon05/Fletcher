import { useEffect, useRef } from "react";
import abcjs from "abcjs";
import 'abcjs/abcjs-audio.css';

const abc = `
X:1
L:1/8
M:4/4
U:n=!style=normal!
I:linebreak $
K:F style=rhythm
V:1 bass transpose=-12
 z8 | z8 | z8 | z4 z2 z nC,/nD,/ |"Fmaj7/E" F,6- F,G,/A,/ |"C" C8 |"Gm" G,4!-(!{/G,} !-)!B,2 D2 |"Bb" B,8 | %8
"F" F,4 "C" F,2 "F" F,2 |$"C" F,8 |"Gm" F,8 |"Bb" F,8 |"F" F,2- F,3 F,3 |"C" F,2- F,3 F,3 |"Gm" F,2- F,3 F,3 | %15
"Bb" F,2- F,3 F,3 |$"F" F,2- F,3 F,3 |"C" F,2- F,3 F,3 |"Gm" F,2- F,3 F,3 |"Bb" F,4"C" F,4 | %20
"F" F,4 F,F,- F,2 |"C" F,4 F,F,- F,2 |$"Gm" F,4 F,F,- F,2 |"Bb" F,4"C" F,4 |"F""^Add fills" F,8 | %25
"C" F,8 |"Gm" F,8 |"Bb" F,8 |"Gm" F,2- F,3 F,3 |"Bb" F,2- F,3 F,3 |$"F" F,2- F,3 F,3 | %31
"C" F,2- F,3 F,3 |"Gm" F,2- F,3 F,3 |"Bb" F,2- F,3 F,3 |"F" F,2- F,3 F,3 | %35
 C,/C,/C,/C,/ z C,/C,/ C,/C,/ z C,<D, |$"Eb" F, F,2 F, F, F,2 F, |"F" F, F,2 F, F, F,2 F, | %38
"Gm" F, F,2 F,"F" F, F,2 F, |"Bb" F, F,2 F,"C" F, F,2 F, |"Eb" F, F,2 F, F, F,2 F, |$ %41
"F" F, F,2 F, F, F,2 F, |"Gm" F,4"F" F,4 |"Bb" F,8 |"C" F,8 |"F" F,6- F,G,/A,/ |"C" C6- CC/D/ | %47
"Gm" G4 G,2 D2 |$"Bb" B,4 C2 F2- |"F" F8 | z8 | z8 |"Bb" .B,,2 z2"C" .C,2 z2 |"F" F,4 F,F,- F,2 | %54
"C" F,4 F,F,- F,2 |"Gm" F,4 F,F,- F,2 |$"Bb" F,4"C""^x3" F,4 |"F" F,4 F,F,- F,2 | %58
"C" F,4 F,F,- F,2 |"Gm" F,4 F,F,- F,2 |"Bb" F,8 |] %61
`;

export function SheetMusic() {
  const ref = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!ref2.current) return;

    abcjs.renderAbc(ref.current, abc, {
      responsive: "resize",
      // chordGrid: "noMusic",
      tablature: [{
        instrument: "violin",
        tuning: ["E,,", "A,,", "D,", "G,"],
      },
      ],
      staffwidth: 2000,
      showDebug: "box"
      // germanAlphabet: true
      // jazzchords: true
    });

    // abcjs.renderAbc(ref2.current, abc, {
    //   responsive: "resize",
    //   tablature: [{
    //     instrument: "violin",
    //     tuning: ["E,,", "A,,", "D,", "G,"],
    //   },
    //   ]
    // });

  }, [ref]);

  return <div>
    <div ref={ref} />
    <div ref={ref2}></div>
  </div> ;
}