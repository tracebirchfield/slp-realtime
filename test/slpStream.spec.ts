import sinon from "sinon";

import { SlpStream } from '../src';
import { pipeFileContents } from '../src/utils/testHelper';

describe('SlpStream', () => {

  describe('when reading from a standard slp file', () => {
    beforeEach(() => {
      jest.setTimeout(1000000);
    });

    it('emits exactly one game start and one game end event', async () => {
      const gameStartSpy = sinon.spy();
      const gameEndSpy = sinon.spy();

      const slpStream = new SlpStream({ singleGameMode: true });
      slpStream.on("gameStart", gameStartSpy);
      slpStream.on("gameEnd", gameEndSpy);

      await pipeFileContents("slp/Game_20190810T162904.slp", slpStream);

      expect(gameStartSpy.callCount).toEqual(1);
      expect(gameEndSpy.callCount).toEqual(1);
    });

  });

});
