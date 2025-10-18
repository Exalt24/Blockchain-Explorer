export interface BatchProcessorOptions<T> {
  batchSize: number;
  flushInterval: number;
  processor: (batch: T[]) => Promise<void>;
}

export class BatchProcessor<T> {
  private batch: T[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processing = false;
  private options: BatchProcessorOptions<T>;

  constructor(options: BatchProcessorOptions<T>) {
    this.options = options;
  }

  async add(item: T): Promise<void> {
    this.batch.push(item);

    if (this.batch.length >= this.options.batchSize) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch(error => {
        console.error('❌ Batch flush error:', error);
      });
    }, this.options.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.processing || this.batch.length === 0) {
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.processing = true;
    const currentBatch = [...this.batch];
    this.batch = [];

    try {
      await this.options.processor(currentBatch);
    } catch (error) {
      console.error('❌ Error processing batch:', error);
      this.batch.unshift(...currentBatch);
    } finally {
      this.processing = false;
    }
  }

  getBatchSize(): number {
    return this.batch.length;
  }

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}