import { when } from "jest-when";
import { createAddressBook } from "./createAddressBook";
import { ContactsModuleRdfLib } from "./ContactsModuleRdfLib";
import { executeUpdate } from "./web-operations/executeUpdate";
import { Fetcher, graph, UpdateManager } from "rdflib";
4;

jest.mock("./createAddressBook");
jest.mock("./web-operations/executeUpdate");

describe("ContactsModuleRdfLib", () => {
  describe("createAddressBook", () => {
    const fakeOperation = {
      uri: "https://pod.test/alice/118b9dc2-dacb-42e4-9d8c-6078aa832f51/index.ttl#this",
      insertions: [],
      deletions: [],
      filesToCreate: [],
    };

    let result: string;
    let fetcher: Fetcher;
    let updater: UpdateManager;
    beforeEach(async () => {
      jest.clearAllMocks();
      // given
      when(createAddressBook)
        .calledWith("https://pod.test/alice/", "My Contacts")
        .mockReturnValue(fakeOperation);

      const store = graph();
      fetcher = new Fetcher(store);
      updater = new UpdateManager(store);
      const module = new ContactsModuleRdfLib({ store, fetcher, updater });

      // when
      result = await module.createAddressBook({
        container: "https://pod.test/alice/",
        name: "My Contacts",
      });
    });

    it("returns the created URI", () => {
      // then
      expect(result).toEqual(
        "https://pod.test/alice/118b9dc2-dacb-42e4-9d8c-6078aa832f51/index.ttl#this",
      );
    });

    it("executes the update operation", () => {
      // then
      expect(executeUpdate).toHaveBeenCalledWith(
        fetcher,
        updater,
        fakeOperation,
      );
    });
  });
});
