import { useEffect, useRef, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { BaseComponentProps, now } from '@adriansteffan/reactive';
import { COLORS } from './common';

/**
 * Feedback types:
 * 1: Correct/Wrong
 * 2: How many are correct/wrong
 * 3: how many correct/wrong + how many colors did you get that are needed elsewhere
 * 3a: how many correct/wrong + how many fields have a wrong color that is needed elsewhere
 * 4: what positions are correct + how many are wrong + how many colors did you get that are needed elsewhere
 * 4a: what positions are correct + how many are wrong + how many fields have a wrong color that is needed elsewhere
 * 5: what position is correct, what position is incorrect, what position has a color that is needed elsewhere (c limited to how many of that color are still needed - how wordle does it)
 * 5a: what position is correct, what position is incorrect, what position has a color that is needed elsewhere (every isntance of a color that is still needed gets a c, even though there might only be 1 left)
 */
type Feedback = 1 | 2 | 3 | '3a' | 4 | '4a' | 5 | '5a';

export type ColorKey = keyof typeof COLORS;

type Size = 8 | 10 | 12 | 14 | 16 | 20 | 24 | 28 | 32;

interface ColorOrbProps {
  color: ColorKey;
  /** Size in Tailwind units (8-32). Defaults to 12 */
  size?: Size;
  interactive?: boolean;
  pressed?: boolean;
  hoverborder?: boolean;
  onClick?: () => void;
}

type GuessResult = {
  color: ColorKey;
  status: 'correct' | 'wrong-position' | 'incorrect';
};

const ColorOrb: React.FC<ColorOrbProps> = ({
  color,
  size = 12,
  interactive = false,
  hoverborder = false,
  pressed = false,
  onClick,
}) => {
  const letter = color === 'grey' ? '?' : color[0].toUpperCase();

  const sizeClasses = {
    8: 'h-8 w-8 text-sm',
    10: 'h-10 w-10 text-base',
    12: 'h-12 w-12 text-lg',
    14: 'h-14 w-14 text-xl',
    16: 'h-16 w-16 text-xl',
    20: 'h-20 w-20 text-2xl',
    24: 'h-24 w-24 text-3xl',
    28: 'h-28 w-28 text-3xl',
    32: 'h-32 w-32 text-4xl',
  }[size];

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent double-firing on mobile devices
    onClick?.();
  };

  const handleTouchEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{
        backgroundColor: COLORS[color],
        color: color === 'grey' ? '#000000' : '#FFFFFF',
      }}
      className={`
        ${sizeClasses}
        rounded-full 
        flex items-center justify-center 
        font-bold
        border-2
        border-black
        
        ${interactive ? ' shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-pointer touch-manipulation' : `border-[${size / 8}px]`}
        ${pressed ? ' translate-x-[2px] translate-y-[2px] shadow-none' : ''}
        ${hoverborder ? ' hover:border-4 cursor-pointer' : ''}
      `}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchEnd={handleTouchEnd}
    >
      {letter}
    </div>
  );
};

// Data structure for each guess
interface GuessData {
  index: number;
  colors: ColorKey[];
  results: GuessResult[];
  isCorrect: boolean;
  start: number;
  end: number;
  duration: number;
}

function useScreenWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      setWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return width;
}

export function MasterMindle({
  feedback = 5,
  next,
  timelimit,
  countUpTo,
  maxGuesses,
  slots = 4,
  colors = 4,
  keepCorrect = true,
}: {
  feedback: Feedback;
  timelimit: number;
  countUpTo?: number;
  maxGuesses: number;
  slots?: number;
  colors?: number;
  keepCorrect?: boolean;
} & BaseComponentProps) {
  // Get available colors (excluding grey)
  const availableColors = Object.keys(COLORS)
    .filter((color) => color !== 'grey')
    .slice(0, colors) as ColorKey[];

  const [selectedColor, setSelectedColor] = useState<ColorKey | null>(null);
  const [currentGuess, setCurrentGuess] = useState<(ColorKey | null)[]>(Array(slots).fill(null));
  const [timeLeft, setTimeLeft] = useState<number>(timelimit);
  const [guessesLeft, setGuessesLeft] = useState<number>(maxGuesses - 1);
  const [roundOver, setRoundOver] = useState<boolean>(false);

  const [guessStartTime, setGuessStartTime] = useState<number>(now());
  const [accumulatedGuesses, setAccumulatedGuesses] = useState<GuessData[]>([]);
  const screenWidth = useScreenWidth();

  const warningShownRef = useRef(false);

  // Reset the current guess when slots change
  useEffect(() => {
    setCurrentGuess(Array(slots).fill(null));
  }, [slots]);

  useEffect(() => {
    warningShownRef.current = false;
  }, [timelimit]);

  useEffect(() => {
    // Only start the timer if the round is not over
    if (roundOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1);

        if (newTime === 30 && !warningShownRef.current) {
          warningShownRef.current = true;
          toast('30 seconds remaining!', {
            position: 'top-center',
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: false,
            progress: undefined,
            theme: 'light',
            transition: Bounce,
            autoClose: 4000,
          });
        }

        // Check if time is up
        if (newTime === 0 && !roundOver) {
          toast.error('Out of time! Continue to the next trial.', {
            closeOnClick: true,
            transition: Bounce,
          });
          setSelectedColor(null);
          setRoundOver(true);
        }

        return newTime;
      });
    }, 1000);

    // Cleanup timer when component unmounts or roundOver changes
    return () => clearInterval(timer);
  }, [roundOver, timeLeft]);

  const [previousGuesses, setPreviousGuesses] = useState<
    { colors: ColorKey[]; results: GuessResult[] }[]
  >([]);

  // Generate a random solution using only the available colors
  const [solution] = useState<ColorKey[]>(() => {
    return Array(slots)
      .fill(null)
      .map(() => availableColors[Math.floor(Math.random() * availableColors.length)]);
  });

  // Add effect to scroll to bottom when previousGuesses changes
  const guessesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (guessesContainerRef.current) {
      guessesContainerRef.current.scrollTop = guessesContainerRef.current.scrollHeight;
    }
  }, [previousGuesses]);

  const checkGuess = (guess: ColorKey[]): GuessResult[] => {
    // Count color frequencies in solution
    const solutionColorCounts = solution.reduce(
      (counts, color) => {
        counts[color] = (counts[color] || 0) + 1;
        return counts;
      },
      {} as Record<ColorKey, number>,
    );

    // First pass: Mark correct positions
    const results: GuessResult[] = guess.map((color, i) => {
      if (color === solution[i]) {
        solutionColorCounts[color]--;
        return { color, status: 'correct' as const };
      }
      return { color, status: 'incorrect' as const };
    });

    // Second pass: Check wrong positions
    for (let i = 0; i < guess.length; i++) {
      if (results[i].status === 'correct') continue;

      const color = guess[i];
      if (solutionColorCounts[color] > 0) {
        results[i] = { color, status: 'wrong-position' as const };
        solutionColorCounts[color]--;
      }
    }

    return results;
  };

  const handleCheck = () => {
    if (currentGuess.some((color) => color === null)) {
      toast('Please complete your guess!', {
        position: 'top-center',
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined,
        theme: 'light',
        transition: Bounce,
      });

      return;
    }

    const currentTime = now();
    const guessResults = checkGuess(currentGuess as ColorKey[]);
    const isCorrect = guessResults.every((result) => result.status === 'correct');

    const guessData: GuessData = {
      index: previousGuesses.length,
      colors: currentGuess as ColorKey[],
      results: guessResults,
      isCorrect: isCorrect,
      start: guessStartTime,
      end: currentTime,
      duration: currentTime - guessStartTime,
    };

    setAccumulatedGuesses((prev) => [...prev, guessData]);

    setPreviousGuesses((prev) => [
      ...prev,
      {
        colors: currentGuess as ColorKey[],
        results: guessResults,
      },
    ]);

    setSelectedColor(null);

    if (isCorrect) {
      toast.success('You found the solution! Continue to the next trial.', {
        closeOnClick: true,
        transition: Bounce,
      });
      setSelectedColor(null);
      setRoundOver(true);
      return;
    }

    setGuessesLeft((prev) => prev - 1);
    if (guessesLeft === 0) {
      toast.error('Out of guesses! Continue to the next trial.', {
        closeOnClick: true,
        transition: Bounce,
      });
      setSelectedColor(null);
      setRoundOver(true);
    }

    if (
      keepCorrect &&
      (feedback === 4 || feedback === '4a' || feedback === 5 || feedback === '5a')
    ) {
      const newGuess = Array(slots)
        .fill(null)
        .map((_, index) => {
          if (guessResults[index].status === 'correct') {
            return currentGuess[index];
          }
          return null;
        });
      setCurrentGuess(newGuess);
    } else {
      setCurrentGuess(Array(slots).fill(null));
    }
    setGuessStartTime(currentTime);
  };

  const handleNextOrSkip = (skipped: boolean) => {
    next({
      solution: solution,
      solved: accumulatedGuesses.some((guess: GuessData) => guess.isCorrect),
      skipped: skipped,
      colors: colors,
      slots: slots,
      timeLeft: timeLeft,
      guesses: accumulatedGuesses,
    });
  };

  const useTwoColumnLayout = availableColors.length > 6;

  return (
    <div className='min-h-screen w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]'>
      <div className='p-4 pt-20 lg:pt-24 max-w-7xl min-h-full w-fit mx-auto flex flex-col lg:flex-row xl:gap-x-12 lg:gap-x-8 justify-between lg:justify-center'>
        {/* Action Buttons */}
        <div className='flex gap-6 xl:w-56 xl:px-12 lg:p-4 flex-row justify-center lg:justify-start lg:flex-col mt-10 lg:mt-0 sm:pb-4 lg:mb-0'>
          {!roundOver && (
            <button
              className='cursor-pointer bg-white px-6 md:px-8 py-3 text-sm md:text-lg border-2 border-black font-bold rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              onClick={handleCheck}
            >
              CHECK
            </button>
          )}
          {!roundOver && (
            <button
              className='cursor-pointer bg-white px-6 md:px-8 py-1 md:py-3 text-sm md:text-lg border-2 border-black font-bold rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              onClick={() => setCurrentGuess(Array(slots).fill(null))}
            >
              CLEAR
            </button>
          )}
          {!roundOver && (
            <button
              className='cursor-pointer bg-white px-6 md:px-8 py-1 md:py-3 text-sm md:text-lg border-2 border-black font-bold border-red-500 text-red-500 rounded-full shadow-[2px_2px_0px_rgba(239,68,68,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              onClick={() => handleNextOrSkip(true)}
            >
              SKIP
            </button>
          )}
          {roundOver && (
            <button
              className='cursor-pointer bg-white px-6 md:px-8 py-3 md:py-3 text-sm md:text-lg border-2 border-black font-bold text-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              onClick={() => handleNextOrSkip(false)}
            >
              NEXT
            </button>
          )}
        </div>

        {/* Gameboard */}
        <div className='flex flex-col justify-between order-first items-center lg:order-none min-h-0'>
          <div className='space-y-4 -mt-8 sm:mt-0 lg:space-y-8 flex-1'>
            {/* Timer */}
            <div className='flex justify-center items-center gap-6'>
              <div className='text-lg text-center sm:text-2xl font-bold w-20'>
                {Math.floor((countUpTo ? countUpTo - timeLeft : timeLeft) / 60)}:
                {((countUpTo ? countUpTo - timeLeft : timeLeft) % 60).toString().padStart(2, '0')}
              </div>
            </div>
            {/* Current Guess Slots */}
            <div className='py-5 sm:py-10 md:p-10 rounded-lg'>
              <div className='flex flex-col gap-8 items-center'>
                {Array.from({ length: Math.ceil(slots / 4) }).map((_, rowIndex) => {
                  const startIndex = rowIndex * 4;
                  const endIndex = Math.min(startIndex + 4, slots);
                  const sourceArray = roundOver ? solution : currentGuess;
                  const rowSlots = sourceArray.slice(startIndex, endIndex);
                  const N = rowSlots.length;
                  const numPlaceholders = 4 - N;

                  let lineElement: any = null;
                  if (N > 1) {
                    const totalColumns = 4;

                    const startOffsetPercent = (1 / (totalColumns * 2)) * 100;

                    const widthPercent = ((N - 1) / totalColumns) * 100;

                    lineElement = (
                      <div
                        className='absolute top-1/2 h-1 bg-gray-300 -z-10'
                        style={{
                          left: `${startOffsetPercent}%`,
                          width: `${widthPercent}%`,
                          transform: 'translateY(-50%)',
                        }}
                        aria-hidden='true'
                      />
                    );
                  }

                  return (
                    <div
                      key={`row-${rowIndex}`}
                      className='grid grid-cols-4 gap-4 sm:gap-8 relative w-fit mx-auto'
                    >
                      {lineElement}

                      {rowSlots.map((color: ColorKey | null, localIndex: number) => {
                        const globalIndex = startIndex + localIndex;
                        return (
                          <ColorOrb
                            key={globalIndex}
                            color={color ?? 'grey'}
                            size={screenWidth >= 600 ? 24 : 16}
                            hoverborder={
                              !roundOver && (selectedColor != null || (!!color && color !== 'grey'))
                            }
                            onClick={() => {
                              if (roundOver) {
                                return;
                              }

                              if (!selectedColor || selectedColor === 'grey') {
                                if (!!color && color !== 'grey') {
                                  setCurrentGuess((prevGuess) =>
                                    prevGuess.map((c, i) => (i === globalIndex ? null : c)),
                                  );
                                  return;
                                }

                                toast('Please select a color first!', {
                                  position: 'top-center',
                                  hideProgressBar: true,
                                  closeOnClick: true,
                                  pauseOnHover: true,
                                  draggable: false,
                                  progress: undefined,
                                  theme: 'light',
                                  transition: Bounce,
                                  autoClose: 2000,
                                });
                                return;
                              }

                              if (selectedColor === color) {
                                setCurrentGuess((prevGuess) =>
                                  prevGuess.map((c, i) => (i === globalIndex ? null : c)),
                                );
                                return;
                              }

                              setCurrentGuess((prevGuess) =>
                                prevGuess.map((c, i) => (i === globalIndex ? selectedColor : c)),
                              );
                            }}
                          />
                        );
                      })}

                      {Array.from({ length: numPlaceholders }).map((_, placeholderIndex) => (
                        <div
                          key={`placeholder-${rowIndex}-${placeholderIndex}`}
                          className={`invisible ${screenWidth >= 600 ? 'h-24 w-24' : 'h-16 w-16'}`}
                          aria-hidden='true'
                        ></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous Guesses */}
            <div
              ref={guessesContainerRef}
              className='space-y-8 md:p-4 lg:p-8 border-gray-400 h-[25vh] lg:h-[40vh] overflow-y-auto'
            >
              {previousGuesses.map((guess, rowNum) => (
                <div
                  key={rowNum}
                  className='flex flex-col sm:flex-row items-center gap-4 justify-center'
                >
                  <div className='hidden sm:block w-4 sm:w-8 text-xl self-start'>{rowNum + 1}</div>

                  <div className='sm:hidden w-full text-center text-xl mb-2'>{rowNum + 1}</div>

                  <div className='grid grid-cols-4 gap-2 sm:gap-4'>
                    {guess.colors.map((color, index) => (
                      <div key={index} className='flex flex-col items-center'>
                        <ColorOrb key={index} color={color} size={12} />
                        {(feedback == '4a' || feedback == 4) && (
                          <span>
                            {guess.results[index].status === 'correct' && '✓'}
                            {guess.results[index].status !== 'correct' && <>&nbsp;</>}
                          </span>
                        )}
                        {feedback == 5 && (
                          <span>
                            {guess.results[index].status === 'correct' && '✓'}
                            {guess.results[index].status === 'incorrect' && '✗'}
                            {guess.results[index].status === 'wrong-position' &&
                              (() => {
                                const remainingInSolution = solution.filter(
                                  (color, i) =>
                                    color === guess.results[index].color &&
                                    guess.results[i].status !== 'correct',
                                ).length;

                                const usedCCount = guess.results
                                  .slice(0, index)
                                  .filter(
                                    (r) =>
                                      r.status === 'wrong-position' &&
                                      r.color === guess.results[index].color,
                                  ).length;

                                return usedCCount < remainingInSolution ? 'C' : '✗';
                              })()}
                          </span>
                        )}
                        {feedback == '5a' && (
                          <span>
                            {guess.results[index].status == 'correct' && '✓'}
                            {guess.results[index].status == 'incorrect' && '✗'}
                            {guess.results[index].status == 'wrong-position' && 'C'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Feedback display */}
                  <div className='flex items-center gap-4 text-lg sm:ml-6 sm:self-center'>
                    {feedback == 1 && (
                      <span>
                        {guess.results.filter((result) => result.status !== 'correct').length ==
                        0 ? (
                          <span className='font-bold text-blue-600'>✓</span>
                        ) : (
                          <span className='font-bold text-red-600'>✗</span>
                        )}
                      </span>
                    )}
                    {feedback == 2 && (
                      <>
                        <span className='font-bold text-blue-600'>✓</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'correct').length}
                        </span>
                        <span className='font-bold text-red-600'>✗</span>
                        <span>
                          {guess.results.filter((result) => result.status !== 'correct').length}
                        </span>
                      </>
                    )}
                    {feedback == 3 && (
                      <>
                        <span className='font-bold text-blue-600'>✓</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'correct').length}
                        </span>
                        <span className='font-bold text-red-600'>✗</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'incorrect').length}
                        </span>
                        <span className='font-bold'>C</span>
                        <span>
                          {
                            new Set(
                              guess.results
                                .filter((result) => result.status === 'wrong-position')
                                .map((result) => result.color),
                            ).size
                          }
                        </span>
                      </>
                    )}
                    {feedback == '3a' && (
                      <>
                        <span className='font-bold text-blue-600'>✓</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'correct').length}
                        </span>
                        <span className='font-bold text-red-600'>✗</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'incorrect').length}
                        </span>
                        <span className='font-bold'>C</span>
                        <span>
                          {
                            guess.results.filter((result) => result.status === 'wrong-position')
                              .length
                          }
                        </span>
                      </>
                    )}
                    {feedback == 4 && (
                      <>
                        <span className='font-bold text-red-600'>✗</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'incorrect').length}
                        </span>
                        <span className='font-bold'>C</span>
                        <span>
                          {
                            new Set(
                              guess.results
                                .filter((result) => result.status === 'wrong-position')
                                .map((result) => result.color),
                            ).size
                          }
                        </span>
                      </>
                    )}
                    {feedback == '4a' && (
                      <>
                        <span className='font-bold text-red-600'>✗</span>
                        <span>
                          {guess.results.filter((result) => result.status === 'incorrect').length}
                        </span>
                        <span className='font-bold'>C</span>
                        <span>
                          {
                            guess.results.filter((result) => result.status === 'wrong-position')
                              .length
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Color Selection */}
        <div
          className={`
        xl:px-8 flex flex-row mt-2 md:mt-0 justify-center gap-x-2 sm:gap-x-8 lg:justify-start max-w-dvw
        ${
          useTwoColumnLayout
            ? 'grid grid-cols-6 gap-y-4 lg:grid lg:grid-cols-2 lg:gap-y-10 lg:h-fit'
            : 'lg:flex-col lg:space-y-6'
        }
        
      `}
        >
          {availableColors.map((color) => (
            <div
              key={color}
              className={`
              flex items-center gap-4
              ${useTwoColumnLayout ? 'lg:justify-center' : ''}
            `}
            >
              <ColorOrb
                color={color}
                size={16}
                interactive={selectedColor != color}
                pressed={selectedColor == color}
                onClick={() => {
                  if (roundOver) {
                    return;
                  }
                  if (selectedColor == color) {
                    setSelectedColor(null);
                    return;
                  }
                  setSelectedColor(color);
                }}
              />

              {!useTwoColumnLayout && (
                <span
                  className={`hidden lg:inline uppercase text-lg ${selectedColor == color ? 'underline underline-offset-2' : ''}`}
                >
                  {color}
                </span>
              )}

              {useTwoColumnLayout && (
                <span
                  className={`lg:hidden uppercase text-lg ${selectedColor == color ? 'underline underline-offset-2' : ''}`}
                ></span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
