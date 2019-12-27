export * from './invoke';
export * from './receiver';
export * from './common';

import { initInvoker } from './bufferSupport/invoke';
import { initReceiver } from './bufferSupport/receiver';

export const bufferSupport = {
  initInvoker,
  initReceiver,
};
