export type ContainerService = any;

export interface IContainer {
  get<T = ContainerService>(key: any): T;
}
