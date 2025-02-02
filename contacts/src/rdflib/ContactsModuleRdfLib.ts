import { Fetcher, IndexedFormula, Node, sym, UpdateManager } from "rdflib";
import { AddressBook, ContactsModule } from "..";
import { AddressBookQuery } from "./AddressBookQuery";
import { createAddressBook } from "./createAddressBook";
import { executeUpdate } from "./web-operations/executeUpdate";

interface CreateAddressBookCommand {
  container: string;
  name: string;
}

interface ModuleConfig {
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
}

export class ContactsModuleRdfLib implements ContactsModule {
  private readonly fetcher: Fetcher;
  private readonly store: IndexedFormula;
  private readonly updater: UpdateManager;

  constructor(config: ModuleConfig) {
    this.store = config.store;
    this.fetcher = config.fetcher;
    this.updater = config.updater;
  }

  async readAddressBook(uri: string): Promise<AddressBook> {
    const addressBookNode = sym(uri);
    await this.fetchNode(addressBookNode);

    const query = new AddressBookQuery(this.store, addressBookNode);
    const title = query.queryTitle();
    const nameEmailIndex = query.queryNameEmailIndex();
    const groupIndex = query.queryGroupIndex();

    await Promise.allSettled([
      this.fetchNode(nameEmailIndex),
      this.fetchNode(groupIndex),
    ]);

    const contacts = query.queryContacts();
    const groups = query.queryGroups();
    return {
      uri,
      title,
      contacts,
      groups,
    };
  }

  private async fetchNode(node: Node | null) {
    if (node) {
      await this.fetcher.load(node.value);
    }
  }

  async createAddressBook({ container, name }: CreateAddressBookCommand) {
    const operation = createAddressBook(container, name);
    await executeUpdate(this.fetcher, this.updater, operation);
    return operation.uri;
  }
}
