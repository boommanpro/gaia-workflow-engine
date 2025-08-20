import { GetFollowNode, LayoutConfig, LayoutOptions, LayoutParams } from './type';
import { LayoutStore } from './store';
import { LayoutPosition } from './position';
import { DagreLayout } from './dagre';

export class Layout {
  private readonly _store: LayoutStore;

  private readonly _layout: DagreLayout;

  private readonly _position: LayoutPosition;

  constructor(config: LayoutConfig) {
    this._store = new LayoutStore(config);
    this._layout = new DagreLayout(this._store);
    this._position = new LayoutPosition(this._store);
  }

  public init(params: LayoutParams, options: LayoutOptions = {}): void {
    this._store.create(params);
    this.setFollowNode(options.getFollowNode);
  }

  public layout(): void {
    if (!this._store.initialized) {
      return;
    }
    this._layout.layout();
  }

  public async position(): Promise<void> {
    if (!this._store.initialized) {
      return;
    }
    return await this._position.position();
  }

  public setFollowNode(getFollowNode?: GetFollowNode): void {
    if (!getFollowNode) return;
    const context = { store: this._store };
    this._store.nodes.forEach((node) => {
      const followTo = getFollowNode(node, context)?.followTo;
      if (!followTo) return;
      const followToNode = this._store.getNode(followTo);
      if (!followToNode) return;
      if (!followToNode.followedBy) {
        followToNode.followedBy = [];
      }
      followToNode.followedBy.push(node.id);
      node.followTo = followTo;
    });
  }
}
