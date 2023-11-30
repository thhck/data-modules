import {
    ThingPersisted,
    buildThing,
    createThing,
    getNamedNode,
    getSolidDataset,
    getThing,
    getUrl,
    saveSolidDatasetAt,
    setThing
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import { getThingAll } from "@inrupt/solid-client";
import {
    BOOKMARK, RDF
} from "@inrupt/vocab-common-rdf";
import { __Bookmark, __forClass, __privateTypeIndex, __publicTypeIndex, __solid_instance, __solid_instance_container, __solidTypeRegistration } from "../constants";
import { namedNode } from '@rdfjs/data-model';

export class TypeIndexHelper {
    constructor() { }

    private static async getProfile(session: Session) {
        if (!session.info.webId) return
        const profileDS = await getSolidDataset(session.info.webId, { fetch: session.fetch })

        const me = getThing(profileDS, session.info.webId);

        return me
    }

    private static async getTypeIndex({ session, isPrivate }: { session: Session, isPrivate: boolean }) {

        const me = await this.getProfile(session)

        if (me) {
            const typeIndex = getNamedNode(me, isPrivate ? __privateTypeIndex : __publicTypeIndex)

            return typeIndex
        } else {
            // TODO: me doc does not exists
            // maybe adding one
            // - create me thing
            // - add typeindex into it if it exists
            // - add instance to typeindex
        }
    }

    public static async getFromTypeIndex(session: Session, isPrivate: true) {
        const typeIndex = await this.getTypeIndex({ session, isPrivate })

        if (!typeIndex) return [];

        const ds = await getSolidDataset(typeIndex?.value, { fetch: session.fetch })

        const all = getThingAll(ds);

        const instances: string[] = []
        const instanceContainers: string[] = []


        all.forEach(x => {
            const forClass = getNamedNode(x, __forClass)

            if (forClass?.value === BOOKMARK.Bookmark) {

                const instance = getNamedNode(x, __solid_instance)?.value
                const instanceContainer = getNamedNode(x, __solid_instance_container)?.value

                instance && instances?.push(instance)
                instanceContainer && instanceContainers?.push(instanceContainer)
            }
        })

        const instanceContainersPromises = instanceContainers.map(async (instanceContainer) => {
            const ds = await getSolidDataset(instanceContainer, { fetch: session.fetch })
            const all = getThingAll(ds);

            const urls = all.map(x => x.url)
            const index = urls.findIndex(x => x === instanceContainer)

            return urls.splice(index, 1)
        })

        const innerInstances = (await Promise.all([...instanceContainersPromises])).flat();


        const responce: string[] = [...new Set([...instances, ...innerInstances])]


        // if (!responce.length) {
        //     await this.registerInTypeIndex(session, defaultIndexUrl, true)

        //     return [defaultIndexUrl]
        // }

        return responce
    }

    public static async registerInTypeIndex(session: Session, indexUrl: string, isPrivate: boolean) {
        const typeIndex = await this.getTypeIndex({ session, isPrivate })

        if (!typeIndex) return // TODO validate

        const ds = await getSolidDataset(typeIndex?.value, { fetch: session.fetch })

        const bookmarkThing = buildThing(createThing({ name: "bookmarks_registery" }))
            .addNamedNode(__forClass, namedNode(__Bookmark))
            .addNamedNode(__solid_instance, namedNode(indexUrl))
            .addUrl(RDF.type, __solidTypeRegistration)
            .build();

        const updatedBookmarkList = setThing(ds, bookmarkThing);

        await saveSolidDatasetAt(typeIndex?.value, updatedBookmarkList, { fetch: session.fetch });
    }
}