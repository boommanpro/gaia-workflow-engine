import { Field } from '@flowgram.ai/free-layout-editor';

export const FormRender = () => (
  <>
    <div className="w-full cursor-move">
      <Field<string> name="title">
        {({ field }) => <h1 className="text-xl font-bold">{field.value}</h1>}
      </Field>
    </div>
    <div className="content flex flex-col gap-3">
      <Field<string> name="input">
        {({ field }) => (
          <div className="inline-flex justify-between w-full">
            <h2 className="text-lg">Input</h2>
            <input
              className="border border-gray-400 rounded"
              value={field.value}
              onChange={field.onChange}
            />
          </div>
        )}
      </Field>
      <Field<string> name="output">
        {({ field }) => (
          <div className="inline-flex justify-between w-full">
            <h2 className="text-lg">Output</h2>
            <input
              className="border border-gray-400 rounded"
              value={field.value}
              onChange={field.onChange}
            />
          </div>
        )}
      </Field>
    </div>
  </>
);
