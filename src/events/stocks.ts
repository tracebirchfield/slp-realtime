import { StockType, didLoseStock } from "slp-parser-js";
import { SlpStream } from "../utils/slpStream";
import { map, filter, distinctUntilChanged } from "rxjs/operators";
import { Observable, merge } from "rxjs";
import { playerFilter, withPreviousFrame } from "../operators/frames";
import { mapFrameToSpawnStockType, mapFramesToDeathStockType, filterJustSpawned } from "../operators/stocks";
import { PercentChange, StockCountChange } from "../types";

export class StockEvents {
  protected stream: SlpStream | null = null;

  public playerSpawn$: Observable<StockType>;
  public playerDied$: Observable<StockType>;
  public percentChange$: Observable<PercentChange>
  public countChange$: Observable<StockCountChange>

  /**
   * Starts listening to the provided stream for Slippi events
   *
   * @param {SlpStream} stream
   * @memberof SlpRealTime
   */
  public setStream(stream: SlpStream): void {
    this.stream = stream;
    this.playerSpawn$ = merge(
      this.playerIndexSpawn(0),
      this.playerIndexSpawn(1),
      this.playerIndexSpawn(2),
      this.playerIndexSpawn(3),
    );
    this.playerDied$ = merge(
      this.playerIndexDied(0),
      this.playerIndexDied(1),
      this.playerIndexDied(2),
      this.playerIndexDied(3),
    );
    this.percentChange$ = merge(
      this.playerIndexPercentChange(0),
      this.playerIndexPercentChange(1),
      this.playerIndexPercentChange(2),
      this.playerIndexPercentChange(3),
    );
    this.countChange$ = merge(
      this.playerIndexStockCountChange(0),
      this.playerIndexStockCountChange(1),
      this.playerIndexStockCountChange(2),
      this.playerIndexStockCountChange(3),
    );
  }

  /**
   * Emits an event each time player spawns.
   */
  public playerIndexSpawn(index: number): Observable<StockType> {
    if (!this.stream) {
      throw new Error("No stream to subscribe to");
    }

    return this.stream.playerFrame$.pipe(
      filterJustSpawned(index),             // Only take the spawn frames
      map((f) => f.players[index].post),    // Only take the post frame data
      mapFrameToSpawnStockType(this.stream.gameStart$, index), // Map the frame to StockType
    );
  }

  /**
   * Emits an event each time player dies.
   */
  public playerIndexDied(index: number): Observable<StockType> {
    if (!this.stream) {
      throw new Error("No stream to subscribe to");
    }

    return this.stream.playerFrame$.pipe(
      playerFilter(index),                  // We only care about certain player frames
      map((f) => f.players[index].post),    // Only take the post frame data
      withPreviousFrame(),                  // Get previous frame too
      filter(([prevFrame, latestFrame]) =>
        didLoseStock(latestFrame, prevFrame)     // We only care about the frames where we just died
      ),
      mapFramesToDeathStockType(this.playerIndexSpawn(index)), // Map the frame to StockType
    );
  }

  public playerIndexPercentChange(index: number): Observable<PercentChange> {
    if (!this.stream) {
      throw new Error("No stream to subscribe to");
    }
    return this.stream.playerFrame$.pipe(
      playerFilter(index),
      map(f => f.players[index].post.percent),
      distinctUntilChanged(),
      map(percent => ({
        playerIndex: index,
        percent,
      })),
    );
  }

  public playerIndexStockCountChange(index: number): Observable<StockCountChange> {
    if (!this.stream) {
      throw new Error("No stream to subscribe to");
    }
    return this.stream.playerFrame$.pipe(
      playerFilter(index),
      map(f => f.players[index].post.stocksRemaining),
      distinctUntilChanged(),
      map(stocksRemaining => ({
        playerIndex: index,
        stocksRemaining,
      })),
    );
  }

}