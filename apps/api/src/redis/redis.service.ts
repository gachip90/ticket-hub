import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

type RedisHashValue = string | number;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async setHash(key: string, values: Record<string, RedisHashValue>) {
    const normalized = Object.entries(values).reduce<Record<string, string>>(
      (accumulator, [field, value]) => {
        accumulator[field] = String(value);
        return accumulator;
      },
      {},
    );

    await this.client.hSet(key, normalized);
  }

  getHash(key: string) {
    return this.client.hGetAll(key);
  }

  async addToSet(key: string, values: string[]) {
    if (!values.length) {
      return;
    }

    await this.client.sAdd(key, values);
  }

  getSetMembers(key: string) {
    return this.client.sMembers(key);
  }

  deleteKey(key: string) {
    return this.client.del(key);
  }

  publish(channel: string, message: string) {
    return this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    onMessage: (message: string) => void | Promise<void>,
  ) {
    const subscriber = this.client.duplicate();

    if (!subscriber.isOpen) {
      await subscriber.connect();
    }

    await subscriber.subscribe(channel, async (message) => {
      await onMessage(message);
    });

    return async () => {
      if (subscriber.isOpen) {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      }
    };
  }

  async runHoldScript(key: string, quantity: number) {
    const result = await this.client.eval(
      `
local available = tonumber(redis.call('HGET', KEYS[1], 'availableQuantity') or '0')
local held = tonumber(redis.call('HGET', KEYS[1], 'heldQuantity') or '0')
local requested = tonumber(ARGV[1])

if available < requested then
  return redis.error_reply('INSUFFICIENT_TICKETS')
end

local availableAfter = redis.call('HINCRBY', KEYS[1], 'availableQuantity', -requested)
local heldAfter = redis.call('HINCRBY', KEYS[1], 'heldQuantity', requested)

return {availableAfter, heldAfter}
      `,
      {
        keys: [key],
        arguments: [String(quantity)],
      },
    );

    return result as number[];
  }

  async runReleaseScript(key: string, quantity: number) {
    const result = await this.client.eval(
      `
local held = tonumber(redis.call('HGET', KEYS[1], 'heldQuantity') or '0')
local releasing = tonumber(ARGV[1])

if held < releasing then
  return redis.error_reply('INSUFFICIENT_HELD_TICKETS')
end

local heldAfter = redis.call('HINCRBY', KEYS[1], 'heldQuantity', -releasing)
local availableAfter = redis.call('HINCRBY', KEYS[1], 'availableQuantity', releasing)

return {availableAfter, heldAfter}
      `,
      {
        keys: [key],
        arguments: [String(quantity)],
      },
    );

    return result as number[];
  }
}
