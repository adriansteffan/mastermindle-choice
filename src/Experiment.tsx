/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExperimentRunner, ExperimentConfig } from '@adriansteffan/reactive';
import { MasterMindle } from './mastermindle';
import { COLORS } from './common';

const config: ExperimentConfig = { showProgressBar: false };

const MAX_TIME = 300;

const experiment = [
  {
    name: 'introtext',
    type: 'Text',
    props: {
      buttonText: "Let's Begin",
      animate: true,
      content: (
        <>
          <h1 className='text-3xl'>
            <strong>Welcome to Mastermindle! </strong>
          </h1>
          <br />
          This page let's you test the new version of mastermindle. <br />
        </>
      ),
    },
  },
  {
    name: 'Init MasterMindleLoop',
    type: 'UPDATE_STORE',
    fun: () => ({
      mastermindle_timelimit: MAX_TIME,
      mastermindle_slots: 4,
      mastermindle_colors: 4,
    }),
  },
  {
    name: 'MasterMindleLoop',
    type: 'WHILE_BLOCK',
    cond: (_data: any, store: any) => store.mastermindle_timelimit >= 0 || true,
    timeline: [
      {
        name: 'MasterMindleSettings',
        type: 'StoreUI',
        props: {
          title: 'MasterMindle Settings',
          fields: [
            {
              type: 'integer',
              storeKey: 'mastermindle_slots',
              label: 'Number of Slots',
              prompt: 'How many slots should be in the combinations?',
              min: 1,
              max: 12,
              defaultValue: 4,
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
              defaultValue: 5,
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
            {
              type: 'integer',
              storeKey: 'mastermindle_feedback',
              label: 'Feedbacktype',
              prompt: 'How should feedback be provided?',
              min: 1,
              max: 5,
              defaultValue: 1,
              component: ({ value }: { value: number }) => (
                <>
                  {value == 1 && <>Correct or wrong</>}
                  {value == 2 && <> How many slots are correct/wrong</>}
                  {value == 3 && (
                    <>
                      How many slots are correct/wrong <br/>
                      How many colors did you get that are needed in a different slot<br/>
                    </>
                  )}
                  {value == 4 && (
                    <>
                      What slots are correct <br/> How many slots are wrong<br/> How many colors did you get
                      that are needed in a different slot
                    </>
                  )}
                  {value == 5 && (
                    <>
                      What slots are correct<br/>
                      What slots are incorrect<br/>
                      What slots have a
                      color that is needed elsewhere
                    </>
                  )}
                </>
              ),
            }
          ],
        },
      },
      {
        name: 'MasterMindle',
        type: 'MasterMindle',
        props: (_data: any, store: any) => ({
          feedback: store.mastermindle_feedback,
          timelimit: store.mastermindle_timelimit,
          slots: store.mastermindle_slots,
          colors: store.mastermindle_colors,
          maxGuesses: 10,
        }),
      },
      {
        type: 'UPDATE_STORE',
        fun: (data: any) => ({
          mastermindle_timelimit: data[data.length - 1].responseData.timeLeft,
        }),
      },
    ],
  },
  {
    name: 'upload',
    type: 'Upload',
    props: {
      autoUpload: false,
    },
  },
  {
    name: 'finaltext',
    type: 'Text',
    props: {
      content: <>Thank you for participating in our study, you can now close the browser window.</>,
    },
  },
];

export default function Experiment() {
  return <ExperimentRunner config={config} timeline={experiment} components={{ MasterMindle }} />;
}
