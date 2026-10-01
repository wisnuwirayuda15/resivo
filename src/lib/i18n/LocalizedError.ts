/**
 * An error whose sentence is a message and not a string.
 *
 * Code that is not a component (the image and font readers, the backup parser)
 * has to say why it refused something, and has no language to say it in: it runs
 * in a worker-free module that knows nothing about React, and the language can
 * change between the refusal and the moment it is shown.
 *
 * So the error carries a key and parameters, and the screen that shows it
 * chooses the words. `message` is still an ordinary English sentence, which is
 * what a log, a test and a person reading a stack trace get, and what is shown
 * for an error that is not one of these.
 *
 * `key` is a namespaced i18next key, `assets:rejected.image.tooLarge`, so a
 * caller does not need to know which namespace a refusal's words live in.
 */
export type ErrorParams = Record<string, string | number>;

export class LocalizedError extends Error {
  readonly key: string;
  readonly params: ErrorParams;

  constructor(message: string, key: string, params: ErrorParams = {}) {
    super(message);
    this.key = key;
    this.params = params;
  }
}
