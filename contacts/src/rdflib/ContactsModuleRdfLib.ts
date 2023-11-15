import {
  Fetcher,
  graph,
  IndexedFormula,
  lit,
  Node,
  st,
  sym,
  UpdateManager,
} from "rdflib";
import { AddressBook, ContactsModule, ModuleConfig } from "..";
import { AddressBookQuery } from "./AddressBookQuery";
import { dc, vcard } from "./namespaces";
import { v4 as uuid } from "uuid";

interface CreateAddressBookCommand {
  container: string;
  name: string;
}

export class ContactsModuleRdfLib implements ContactsModule {
  private fetcher: Fetcher;
  private store: IndexedFormula;
  private updater: UpdateManager;

  constructor(config: ModuleConfig) {
    this.store = graph();
    this.fetcher = new Fetcher(this.store, { fetch: config.fetch });
    this.updater = new UpdateManager(this.store);
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
    const uri = `${container}${uuid()}/index.ttl#this`;
    const nameEmailIndexUri = `${container}${uuid()}/people.ttl`;
    const groupIndexUri = `${container}${uuid()}/groups.ttl`;
    await this.updater.update(
      [],
      [
        st(
          sym(uri),
          sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          vcard("AddressBook"),
          sym(uri).doc(),
        ),
        st(sym(uri), dc("title"), lit(name), sym(uri).doc()),
        st(
          sym(uri),
          vcard("nameEmailIndex"),
          sym(nameEmailIndexUri),
          sym(uri).doc(),
        ),
        st(sym(uri), vcard("groupIndex"), sym(groupIndexUri), sym(uri).doc()),
      ],
    );
    return uri;
  }
}
