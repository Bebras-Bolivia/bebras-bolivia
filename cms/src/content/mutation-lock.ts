let contentMutationQueue = Promise.resolve();

export function withContentMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = contentMutationQueue.then(mutation, mutation);
  contentMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}
