/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExperimentRunner,
  ExperimentConfig,
  getParam,
  registerArrayExtensions,
  subsetExperimentByParam,
  TrialData,
} from '@adriansteffan/reactive';
import { MasterMindle } from './mastermindle';
import { COLORS } from './common';

registerArrayExtensions();

const config: ExperimentConfig = { showProgressBar: false };

const MAX_TIME = getParam('timelimit', 600, 'number', 'The timelimit in seconds');
const PRACTICE_TIME = getParam(
  'timelimit_practice',
  60,
  'number',
  'The time limit for each of the practice runs',
);

const GUESSES = getParam('guesses', 10, 'number', 'The number of guesses the participants get');

const DEFAULT_COLORS = getParam(
  'starting_colors',
  -1,
  'number',
  'Initial colors, random if not set',
);
const DEFAULT_SLOTS = getParam('starting_slots', -1, 'number', 'Initial slots, random if not set');

const STARTING_COLORS = DEFAULT_COLORS === -1 ? [3].sample(1)[0] : DEFAULT_COLORS;
const STARTING_SLOTS = DEFAULT_SLOTS === -1 ? [3].sample(1)[0] : DEFAULT_SLOTS;

const FEEDBACK_TYPE = getParam('feedback', 5, 'number', 'Feedbacktype, default is Wordle type');

const PRACTICE_COLORS_1 = getParam(
  'practice_colors_1',
  2,
  'number',
  'Number of possible colors for the first practice trial',
);
const PRACTICE_SLOTS_1 = getParam(
  'practice_slots_1',
  2,
  'number',
  'Number of slots for the first practice run',
);

const PRACTICE_COLORS_2 = getParam(
  'practice_colors_2',
  5,
  'number',
  'Number of possible colors for the second practice trial',
);
const PRACTICE_SLOTS_2 = getParam(
  'practice_slots_2',
  5,
  'number',
  'Number of slots for the second practice run',
);

const flatteners = {
  MasterMindle: (item: TrialData) => {
    const results: Record<string, number | boolean | string>[] = [];
    const { index, trialNumber, start, end, duration, type, name } = item;
    const { solution, solved, slots, colors, skipped, timeLeft, guesses } = item.responseData;

    const baseData = {
      trialIndex: index,
      trialNumber,
      trialStart: start,
      trialEnd: end,
      trialDuration: duration,
      trialType: type,
      trialName: name,
      solution: solution.join(','),
      solved,
      slots,
      colors,
      skipped,
      timeLeft,
    };

    if (guesses?.length) {
      guesses.forEach((guess, guessIdx) => {
        results.push({
          ...baseData,
          guessIndex: guessIdx,
          guessStart: guess.start,
          guessEnd: guess.end,
          guessDuration: guess.duration,
          isCorrect: guess.isCorrect,
          guessColors: guess.colors.join(','),
          resultStatuses: guess.results.map((r: any) => r.status).join(','),
        });
      });
    } else {
      results.push({
        ...baseData,
        guessIndex: '',
        guessStart: '',
        guessEnd: '',
        guessDuration: '',
        isCorrect: '',
        guessColors: '',
        resultStatuses: '',
      });
    }

    return results;
  },
};

const experiment = subsetExperimentByParam([
  {
    name: 'CheckDevice',
    type: 'CheckDevice',
    props: {
      check: (deviceInfo: any) => {
        return !deviceInfo.isMobile;
      },
    },
  },
  {
    type: 'Text',
    props: {
      buttonText: "Let's Begin",
      animate: true,
      content: (
        <>
          <h1>
            <strong>Welcome to our experiment!</strong>
          </h1>
          <br />
          In this study we investigate how people shape their game experience if given the choice.
          You will a play a game where you need to guess a secret color code while the game supports
          you with feedback. Between rounds, you will be able to adjust the game rules. <br />
        </>
      ),
    },
  },
  {
    name: 'consent',
    type: 'Text',
    props: {
      buttonText: 'Accept',
      animate: true,
      content: (
        <>
          <h1>
            <strong>Participant Information</strong>
          </h1>
          This study is part of a scientific research project conducted by the Chair of
          Computational Psychology at LMU Munich. Your decision to complete this study is voluntary.
          We will only have access to your Prolific ID and no other information to identify you. The
          only other information we will have, in addition to your response, is the time at which
          you completed the tasks and the amount of time you spent to complete it. The results of
          the research may be presented at scientific meetings or published in scientific journals.
          Clicking on the 'Accept' button on the bottom of this page indicates that you are at least
          18 years of age, and agree to complete this study voluntarily.
          <br />
        </>
      ),
    },
  },
  {
    type: 'Text',
    props: {
      buttonText: 'Start',
      content: (
        <>
          <h1>How to play:</h1>

          <p>
            In each round of this game you will try to guess the correct color-code, starting from
            an empty array. To assemble a guess, choose a color on the right and then click the
            empty spots in the middle of the board (each color can be used multiple times). You will
            then receive feedback on whether your guess was correct or, if not, which positions are
            correct (✓), which are incorrect (X), and which have a correct colour which is found in
            another spot (C). For example:
          </p>
          <img className='my-10 w-96 mx-auto' src='/5.png' />
          <p>
            Each game round has a specific code to be guessed and you will be allowed to take a
            maximum of {GUESSES} guesses, which you will be able to verify using the “CHECK” button;
            however, there will also be a “SKIP” button available, should you wish to forfeit the
            current secret colour code and continue the game with another one.
            <br />
            <br />
            Let's start the first practice round, which contains a code consisting of{' '}
            {PRACTICE_SLOTS_1} slots with {PRACTICE_COLORS_1} possible colors. Press the Start
            button below to begin.
          </p>
        </>
      ),
    },
  },
  {
    name: 'MasterMindlePractice1',
    type: 'MasterMindle',
    props: {
      feedback: FEEDBACK_TYPE,
      timelimit: PRACTICE_TIME,
      slots: PRACTICE_SLOTS_1,
      colors: PRACTICE_COLORS_1,
      maxGuesses: GUESSES,
    },
  },
  {
    type: 'Text',
    props: {
      buttonText: 'Start',
      animate: true,
      content: (
        <>
          <h1>Get ready!</h1>
          <p>
            Let's do another round of practice! This time, it contains a code consisting of{' '}
            {PRACTICE_SLOTS_2} slots with {PRACTICE_COLORS_2} possible colors. Press the Start
            button below to begin.
          </p>
        </>
      ),
    },
  },
  {
    name: 'MasterMindlePractice2',
    type: 'MasterMindle',
    props: {
      feedback: FEEDBACK_TYPE,
      timelimit: PRACTICE_TIME,
      slots: PRACTICE_SLOTS_2,
      colors: PRACTICE_COLORS_2,
      maxGuesses: GUESSES,
    },
  },
  {
    type: 'Text',
    props: {
      buttonText: 'Start',
      animate: true,
      content: (
        <>
          <h1>Get ready!</h1>
          <p>
            Alright, let's get into the real game! We will play this game for {MAX_TIME / 60}{' '}
            minutes. The game will start with a code consisting of {STARTING_SLOTS} slots with{' '}
            {STARTING_COLORS} possible colors, however, after every round you will have the ability
            to adjust these values.
          </p>
        </>
      ),
    },
  },
  {
    name: 'Init MasterMindleLoop',
    type: 'UPDATE_STORE',
    fun: () => ({
      mastermindle_timelimit: MAX_TIME,
      mastermindle_slots: STARTING_SLOTS,
      mastermindle_colors: STARTING_COLORS,
    }),
  },
  {
    name: 'MasterMindleLoop',
    type: 'WHILE_BLOCK',
    cond: (_data: any, store: any) => store.mastermindle_timelimit > 0,
    timeline: [
      {
        name: 'MasterMindle',
        type: 'MasterMindle',
        props: (_data: any, store: any) => ({
          feedback: FEEDBACK_TYPE,
          timelimit: store.mastermindle_timelimit,
          slots: store.mastermindle_slots,
          colors: store.mastermindle_colors,
          maxGuesses: GUESSES,
        }),
      },
      {
        type: 'UPDATE_STORE',
        fun: (data: any) => ({
          mastermindle_timelimit: data[data.length - 1].responseData.timeLeft,
        }),
      },
      {
        type: 'IF_BLOCK',
        cond: (_data: any, store: any) => store.mastermindle_timelimit > 0,
        timeline: [
          {
            name: 'MasterMindleSettings',
            type: 'StoreUI',

            props: {
              title: 'Adjust your game!',
              description:
                'You are free to adjust the difficulty of the game by increading or decreating the number of slots and/or the number of colors!',
              fields: [
                {
                  type: 'integer',
                  storeKey: 'mastermindle_slots',
                  label: 'Number of Slots',
                  prompt: 'How many slots should be in the combinations?',
                  min: 1,
                  max: 12,
                  defaultValue: STARTING_SLOTS,
                  component: ({ value }: { value: number }) => (
                    <div className='flex items-center justify-center space-x-2 p-4 bg-gray-100 rounded-lg'>
                      {Array.from({ length: value || 0 }).map((_, index) => (
                        <div
                          key={index}
                          className='w-8 h-8 rounded-full bg-gray-400 border-2 border-gray-400'
                        />
                      ))}
                    </div>
                  ),
                },
                {
                  type: 'integer',
                  storeKey: 'mastermindle_colors',
                  label: 'Number of Colors',
                  prompt: 'How many different colors should be available?',
                  min: 1,
                  max: 12,
                  defaultValue: STARTING_COLORS,
                  component: ({ value }: { value: number }) => {
                    return (
                      <div className='flex items-center justify-center flex-wrap gap-2 p-4 bg-gray-100 rounded-lg'>
                        {Object.keys(COLORS)
                          .filter((color) => color !== 'grey')
                          .slice(0, value)
                          .map((colorKey, index) => (
                            <div
                              key={index}
                              className='w-8 h-8 rounded-full'
                              style={{ backgroundColor: COLORS[colorKey as keyof typeof COLORS] }}
                            />
                          ))}
                      </div>
                    );
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    type: 'Upload',
    props: {
      sessionCSVBuilder: {
        filename: '',
        trials: ['CheckDevice'],
        fun: (sessionInfo: Record<string, any>) => {
          sessionInfo['starting_colors'] = STARTING_COLORS;
          sessionInfo['starting_slots'] = STARTING_SLOTS;
          return sessionInfo;
        },
      },
      trialCSVBuilder: {
        flatteners: flatteners,
        builders: [
          {
            filename: `_TRIALMM__${Date.now()}`,
            trials: ['MasterMindlePractice1', 'MasterMindlePractice2'],
          },
          {
            filename: `_MM__${Date.now()}`,
            trials: ['MasterMindle'],
          },
          {
            filename: `_SETTINGS__${Date.now()}`,
            trials: ['MasterMindleSettings'],
          },
        ],
      },
    },
  },
  {
    type: 'ProlificEnding',
    hideSettings: true,
    props: { prolificCode: import.meta.env.VITE_PROLIFIC_CODE },
  },
]);

export default function Experiment() {
  return <ExperimentRunner config={config} timeline={experiment} components={{ MasterMindle }} />;
}
