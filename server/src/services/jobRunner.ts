export interface JobRunner {
  enqueue(job: () => Promise<unknown>): void;
}

export class InProcessJobRunner implements JobRunner {
  enqueue(job: () => Promise<unknown>): void {
    queueMicrotask(() => { void job(); });
  }
}

export const jobRunner: JobRunner = new InProcessJobRunner();
