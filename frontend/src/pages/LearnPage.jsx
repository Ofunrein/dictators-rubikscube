/**
 * LearnPage.jsx — /learn route — Step-by-step 3x3 Rubik's Cube solving guide
 *
 * Presents Eric's solving guide as an interactive carousel. Users click
 * left/right (or use arrow keys) to navigate through 8 major steps, each
 * with sub-steps containing text instructions and animated GIFs.
 *
 * GIFs are hosted externally on GitHub to avoid Vercel deployment size limits.
 * The guide covers the beginner layer-by-layer method:
 *   1. Daisy → 2. White Cross → 3. First Layer → 4. Second Layer →
 *   5. Yellow Cross → 6. Yellow Face → 7. Third Layer Corners →
 *   8. Third Layer Edges
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

const CDN = 'https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main';

const STEPS = [
  {
    step: 0,
    title: 'Introduction',
    subtitle: 'Notation & Terminology',
    text: `This guide walks you through solving a 3×3 Rubik's Cube using the beginner layer-by-layer method.\n\n"Tiles" are the 9 colored squares on each face. "Pieces" are the physical cubies they sit on. Corner pieces have 3 tiles; edge pieces have 2. The center tile determines a face's color.\n\nNotation: U (Up), D (Down), L (Left), R (Right), F (Front), B (Back). An apostrophe (') means counterclockwise. A "2" means turn twice.`,
    gif: null,
  },
  {
    step: 1,
    title: 'Step 1',
    subtitle: 'The Daisy',
    text: `Form a "daisy" by moving all four white edge tiles next to the yellow center tile. There's no specific algorithm — just move white edges to the top face without displacing ones already in place. Corner colors don't matter yet.`,
    gif: `${CDN}/Daisy.gif`,
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'The White Cross',
    text: `With the daisy formed, look at the other color on each white edge piece. Rotate the top layer until that side color matches the center tile of its side face. Then rotate that side face twice (e.g. F2) to send the white edge down.`,
    gif: `${CDN}/White_Cross_From_Daisy.gif`,
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'White Cross — Result',
    text: `You should now have a white cross on the bottom with each edge's side color matching the center tile of its face.`,
    gif: `${CDN}/White_Cross_Solved.gif`,
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Corner Insert',
    text: `Flip the cube so white is on the bottom. Find a white corner tile on the top row of a side face. Rotate the top layer until the other side color matches a center tile. Then insert:\n\n• Right side: R U R'\n• Left side: L' U' L`,
    gif: `${CDN}/First_Layer_Tile_Insert.gif`,
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Bottom Row Tile',
    text: `If a white tile is stuck in the bottom row instead of the top, move it up first:\n\n• Right side: R U' R'\n• Left side: L' U L\n\nThen use the normal insertion algorithm.`,
    gif: `${CDN}/First_Layer_Bottom_Row_Tile.gif`,
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Top Face Tile',
    text: `If the white tile is on the top face, rotate the top layer until it's above an unsolved corner. Then:\n\n• Right side: R U2 R'\n• Left side: L' U2 L\n\nThis moves it to the top row so you can insert normally.`,
    gif: `${CDN}/First_Layer_Top_Tile.gif`,
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Result',
    text: `After inserting all four white corner pieces, you should have a solved white face and a complete first layer.`,
    gif: `${CDN}/First_Layer_Solved.gif`,
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Right Insert',
    text: `Find a non-yellow edge piece in the top layer. Line up the side color with its matching center tile. If the top color matches the right side:\n\nU R U' R' U' F' U F`,
    gif: `${CDN}/Second_Layer_Right_Insert.gif`,
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Left Insert',
    text: `If the top color matches the left side:\n\nU' L' U L U F U' F'`,
    gif: `${CDN}/Second_Layer_Left_Insert.gif`,
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Mismatch Fix',
    text: `If all top-layer edges have yellow but the second layer isn't solved, you have a mismatch. "Boot" the misplaced edge by inserting any other edge into its spot using the left/right algorithm. The mismatched piece goes to the top layer where you can re-insert it correctly.`,
    gif: `${CDN}/Second_Layer_Mismatch.gif`,
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Result',
    text: `With all four non-yellow edge pieces correctly inserted, the second layer is solved.`,
    gif: `${CDN}/Second_Layer_Solved.gif`,
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Dot',
    text: `Time to make a yellow cross on top. The only algorithm you need is the "dog algorithm":\n\nF U R U' R' F'\n\n(FUR-URF, like a dog's fur and bark!)\n\nIf you have a yellow dot (no yellow edges on top), just perform the algorithm.`,
    gif: `${CDN}/Yellow_Cross_Dot.gif`,
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Bar',
    text: `If you have a yellow bar (two opposite yellow edges), orient it left-to-right, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Bar.gif`,
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Crescent',
    text: `If you have a yellow crescent (two perpendicular yellow edges), orient them pointing up-and-left, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Crescent.gif`,
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Cross Pattern',
    text: `Now solve the entire yellow face using the "spinning algorithm":\n\nR U R' U R U2 R'\n\nIf you have no yellow corners on top (cross pattern), move the top layer so a yellow corner is on the left face, then perform the algorithm.`,
    gif: `${CDN}/Top_Face_Cross.gif`,
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Tank Pattern',
    text: `If two yellow corners are on the same side (tank pattern), position the yellow corner tile on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Tank.gif`,
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Figure-8 Pattern',
    text: `If two yellow corners are diagonally opposite (figure-8), position a yellow corner on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Figure8.gif`,
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Fish Pattern',
    text: `If one yellow corner is on top (fish pattern), make the fish point down-and-left, then:\n\nR U R' U R U2 R'\n\nIf you get the fish again, orient it down-and-right and repeat.`,
    gif: `${CDN}/Top_Face_Fish.gif`,
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Opposites',
    text: `Position the yellow corner pieces correctly using the "double-back algorithm":\n\nR' F R' B2 R F' R' B2 R2\n\nRotate the top layer until two corners match their side colors. If the correct corners are diagonally opposite, just perform the algorithm.`,
    gif: `${CDN}/Corner_Solve_Opposites.gif`,
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Tail Lights',
    text: `If the two correct corners are on the same side (like taillights on a car), put them at the back, then:\n\nR' F R' B2 R F' R' B2 R2\n\nAfterward, rotate the top layer to align all corners.`,
    gif: `${CDN}/Corner_Solve_Tail_Lights.gif`,
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — No Solved Face',
    text: `Last step! Position the final edge pieces using the "front flipper algorithm":\n\nF2 U L R' F2 L' R U F2\n\nIf no side face is fully solved, just perform the algorithm.`,
    gif: `${CDN}/Last_Edges_No_Solved_Side_Face.gif`,
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Solved Face',
    text: `If one side face is solved, move it to the back, then:\n\nF2 U L R' F2 L' R U F2\n\nIf not solved yet, perform the algorithm again.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part1.gif`,
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Repeat',
    text: `Sometimes you need to repeat the front flipper algorithm a second time. That's normal.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part2.gif`,
  },
  {
    step: 8,
    title: 'Congratulations!',
    subtitle: 'Cube Solved',
    text: `You've solved the Rubik's Cube! With practice, you'll memorize these algorithms and solve faster each time. Head to the simulator to practice.`,
    gif: `${CDN}/Solved_Cube.gif`,
  },
];

const TOTAL_STEPS = 8;

export default function LearnPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  const current = STEPS[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < STEPS.length - 1;

  const goNext = useCallback(() => {
    if (canNext) { setCurrentIndex((i) => i + 1); setImgLoaded(false); }
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (canPrev) { setCurrentIndex((i) => i - 1); setImgLoaded(false); }
  }, [canPrev]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Preload next image
  useEffect(() => {
    if (currentIndex < STEPS.length - 1) {
      const next = STEPS[currentIndex + 1];
      if (next.gif) {
        const img = new Image();
        img.src = next.gif;
      }
    }
  }, [currentIndex]);

  const progressPercent = ((currentIndex + 1) / STEPS.length) * 100;

  const bg = isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink';
  const cardBg = isDark ? 'bg-[#111] border-white/8' : 'bg-white border-dictator-ink/10 shadow-sm';
  const muted = isDark ? 'text-white/50' : 'text-dictator-ink/50';
  const textPrimary = isDark ? 'text-white' : 'text-dictator-ink';
  const dotActive = 'bg-dictator-red';
  const dotInactive = isDark ? 'bg-white/15' : 'bg-dictator-ink/15';
  const navBtn = isDark
    ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    : 'border-dictator-ink/15 bg-white text-dictator-ink/60 hover:bg-dictator-ink/5 hover:text-dictator-ink';
  const navBtnDisabled = isDark
    ? 'border-white/5 bg-white/[0.02] text-white/15 cursor-not-allowed'
    : 'border-dictator-ink/8 bg-dictator-ink/[0.02] text-dictator-ink/15 cursor-not-allowed';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bg}`}>
      <PageNavbar />

      {/* Progress bar */}
      <div className={`h-0.5 ${isDark ? 'bg-white/5' : 'bg-dictator-ink/5'}`}>
        <div
          className="h-full bg-dictator-red transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-1">
              {current.title}
            </p>
            <h1 className={`font-heading text-xl sm:text-2xl tracking-tight ${textPrimary}`}>
              {current.subtitle}
            </h1>
          </div>
          <p className={`font-mono text-[11px] ${muted}`}>
            {currentIndex + 1} / {STEPS.length}
          </p>
        </div>

        {/* Content card */}
        <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden ${cardBg}`}>
          {/* GIF area */}
          {current.gif ? (
            <div className={`relative flex items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.02]'}`}
              style={{ minHeight: '280px' }}
            >
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-dictator-red/30 border-t-dictator-red rounded-full animate-spin" />
                </div>
              )}
              <img
                key={current.gif}
                src={current.gif}
                alt={current.subtitle}
                onLoad={() => setImgLoaded(true)}
                className={`max-h-[400px] w-auto max-w-full rounded-lg transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>
          ) : (
            <div className={`flex items-center justify-center p-8 ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.02]'}`}
              style={{ minHeight: '200px' }}
            >
              <RotateCcw size={48} className="text-dictator-red/30" />
            </div>
          )}

          {/* Text area */}
          <div className="p-5 sm:p-8">
            {current.text.split('\n\n').map((para, i) => (
              <p key={i} className={`font-body text-sm leading-relaxed mb-3 last:mb-0 ${isDark ? 'text-white/80' : 'text-dictator-ink/80'}`}>
                {para.split('\n').map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS + 2 }).map((_, i) => {
              const stepNum = i - 1;
              const isCurrentStep = current.step === stepNum || (i === 0 && current.step === 0) || (i === TOTAL_STEPS + 1 && currentIndex === STEPS.length - 1);
              return (
                <button
                  key={i}
                  onClick={() => {
                    const target = STEPS.findIndex((s) => s.step === stepNum);
                    if (target >= 0) { setCurrentIndex(target); setImgLoaded(false); }
                  }}
                  className={`rounded-full transition-all duration-300 ${
                    isCurrentStep ? `w-6 h-2 ${dotActive}` : `w-2 h-2 ${dotInactive} hover:opacity-60`
                  }`}
                  title={i === 0 ? 'Intro' : i <= TOTAL_STEPS ? `Step ${i}` : 'Done'}
                />
              );
            })}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className={`flex items-center gap-1 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                canPrev ? navBtn : navBtnDisabled
              }`}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            {currentIndex === STEPS.length - 1 ? (
              <button
                onClick={() => navigate('/simulator')}
                className="flex items-center gap-1 rounded-full bg-dictator-red text-white px-5 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-dictator-deep transition-colors"
              >
                Start Solving
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canNext}
                className={`flex items-center gap-1 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                  canNext ? navBtn : navBtnDisabled
                }`}
              >
                Next
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
