{
  /* TODO */
}

// import { WorkflowDocument, useService } from '@flowgram.ai/free-layout-editor';
// import { useState } from 'react';

export const Tools = () => (
  // const [isLoading, setIsLoading] = useState(false);
  // const document = useService(WorkflowDocument);

  // const handleRun = async () => {
  //   try {
  //     setIsLoading(true);
  //     const response = await fetch('/api/runtime', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         json: document.toJSON(),
  //       }),
  //     });
  //     const data = await response.json();

  //     if (!data.success) {
  //       throw new Error(data.error || 'process failed');
  //     }

  //     console.log('run success', data.data);
  //   } catch (error) {
  //     console.error(error instanceof Error ? error.message : 'run failed');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  <div className="mastra-workflow-tools absolute z-[999] bottom-4 left-1/2">
    {/* <button
        className="bg-blue-400 cursor-pointer active:bg-blue-500 p-2 rounded"
        onClick={handleRun}
        disabled={isLoading}
      >
        <p className="text-white">TEST RUN</p>
      </button> */}
  </div>
);
