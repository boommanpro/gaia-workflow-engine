import { Snapshot, VOData } from '@flowgram.ai/runtime-interface';

export const snapshotsToVOData = (snapshots: Snapshot[]): VOData<Snapshot>[] =>
  snapshots.map((snapshot) => {
    const { nodeID, inputs, outputs, data, branch } = snapshot;
    const newSnapshot: VOData<Snapshot> = {
      nodeID,
      inputs,
      outputs,
      data,
    };
    if (branch) {
      newSnapshot.branch = branch;
    }
    return newSnapshot;
  });
