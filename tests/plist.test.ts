import { describe, expect, it } from "@jest/globals";
import { convertPlistLikeArrayToObject } from "../src/utils";

describe("Plist like array convert to object", () => {
  it("should convert successfly", (done) => {
    const input = [
      ":textDocument",
      [
        ":uri",
        "test",
        ":languageId",
        "javascript",
        ":version",
        0,
        ":text",
        "helle world",
      ],
      ":contentChanges",
      [
        [
          ":range",
          [":start", "45", ":end", "50"],
          ":rangeLength",
          5,
          ":text",
          "hello",
        ],
      ],
    ];
    const ret = convertPlistLikeArrayToObject(input);
    expect(ret).toEqual({
      textDocument: {
        uri: "test",
        languageId: "javascript",
        version: 0,
        text: "helle world",
      },
      contentChanges: [
        {
          range: {
            start: "45",
            end: "50",
          },
          rangeLength: 5,
          text: "hello",
        },
      ],
    });
    done();
  });

  it('should return the input', (done) => {
    const input = [
      ":textDocument",
      [
        ":uri",
        "test",
        ":languageId",
        "javascript",
        ":version",
        0,
        ":text",
        "helle world",
      ],
      "contentChanges",
      [
        [
          ":range",
          [":start", "45", ":end", "50"],
          ":rangeLength",
          5,
          ":text",
          "hello",
        ],
      ],
    ];
    const ret = convertPlistLikeArrayToObject(input);
    expect(ret).toEqual(input);
    done();
  })
});
