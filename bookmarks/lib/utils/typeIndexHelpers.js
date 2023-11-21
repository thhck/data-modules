var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createSolidDocument, fetchSolidDocument, updateSolidDocument, } from "@noeldemartin/solid-utils";
import { getEngine } from "soukai";
import { SolidContainer, SolidEngine, SolidTypeRegistration, } from "soukai-solid";
import { v4 } from "uuid";
import { urlParentDirectory } from "./urlHelpers";
export function getTypeIndexFromPofile(args) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const profile = yield fetchSolidDocument(args.webId, args.fetch);
        const containerQuad = profile
            .statements(undefined, "rdf:type", "http://schema.org/Person")
            .find((statement) => profile.contains(statement.subject.value, args.typePredicate));
        return (_a = profile.statement(containerQuad === null || containerQuad === void 0 ? void 0 : containerQuad.subject.value, args.typePredicate)) === null || _a === void 0 ? void 0 : _a.object.value;
    });
}
export const registerInTypeIndex = (args) => __awaiter(void 0, void 0, void 0, function* () {
    const typeRegistration = new SolidTypeRegistration({
        forClass: args.forClass,
        instanceContainer: args.instanceContainer,
    });
    typeRegistration.mintUrl(args.typeIndexUrl, true, v4());
    yield typeRegistration.withEngine(getEngine(), () => { var _a; return typeRegistration.save((_a = urlParentDirectory(args.typeIndexUrl)) !== null && _a !== void 0 ? _a : ""); });
});
export function createTypeIndex(webId, type, fetch) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseURL = webId.split("profile")[0];
        // fetch = fetch ?? window.fetch.bind(fetch);
        // const typeIndexUrl = await mintTypeIndexUrl(baseURL, type, fetch);
        const typeIndexUrl = `${baseURL}settings/${type}TypeIndex.ttl`;
        const typeIndexBody = type === "public"
            ? "<> a <http://www.w3.org/ns/solid/terms#TypeIndex> ."
            : `
            <> a
                <http://www.w3.org/ns/solid/terms#TypeIndex>,
                <http://www.w3.org/ns/solid/terms#UnlistedDocument> .
        `;
        const profileUpdateBody = `
        INSERT DATA {
            <${webId}> <http://www.w3.org/ns/solid/terms#${type}TypeIndex> <${typeIndexUrl}> .
        }
    `;
        yield Promise.all([
            createSolidDocument(typeIndexUrl, typeIndexBody, fetch),
            updateSolidDocument(webId, profileUpdateBody, fetch), // https://reza-soltani.solidcommunity.net/profile/card
        ]);
        if (type === "public") {
            // TODO Implement updating ACLs for the listing itself to public
        }
        return typeIndexUrl;
    });
}
function findRegistrations(typeIndexUrl, type, predicate, fetch) {
    return __awaiter(this, void 0, void 0, function* () {
        const typeIndex = yield fetchSolidDocument(typeIndexUrl, fetch);
        const types = Array.isArray(type) ? type : [type];
        return types
            .map((type) => typeIndex
            .statements(undefined, "rdf:type", "solid:TypeRegistration")
            .filter((statement) => typeIndex.contains(statement.subject.value, "solid:forClass", type))
            .map((statement) => typeIndex.statements(statement.subject.value, predicate))
            .flat()
            .map((statement) => statement.object.value)
            .filter((url) => !!url))
            .flat();
    });
}
export function findContainerRegistrations(typeIndexUrl, type, fetch) {
    return __awaiter(this, void 0, void 0, function* () {
        return findRegistrations(typeIndexUrl, type, "solid:instanceContainer", fetch);
    });
}
export function findInstanceRegistrations(typeIndexUrl, type, fetch) {
    return __awaiter(this, void 0, void 0, function* () {
        return findRegistrations(typeIndexUrl, type, "solid:instance", fetch);
    });
}
export const fromTypeIndex = (typeIndexUrl, childrenModelClass) => __awaiter(void 0, void 0, void 0, function* () {
    const engine = getEngine();
    const fetch = engine instanceof SolidEngine ? engine.getFetch() : undefined;
    const containerPromise = findContainerRegistrations(typeIndexUrl, childrenModelClass.rdfsClasses, fetch);
    const instancePromise = findInstanceRegistrations(typeIndexUrl, childrenModelClass.rdfsClasses, fetch);
    const allPromise = Promise.all([containerPromise, instancePromise]);
    try {
        const [containers, instances] = yield allPromise;
        const result = [
            ...containers.map((url) => SolidContainer.newInstance({ url }, true)),
            ...instances.map((url) => SolidContainer.newInstance({ url }, true)),
        ];
        return result;
    }
    catch (error) {
        console.log("🚀 ~ file: utils.ts:389 ~ error:", error);
    }
    // const c_urls = await findContainerRegistrations(typeIndexUrl, childrenModelClass.rdfsClasses, fetch);
    // const i_urls = await findInstanceRegistrations(typeIndexUrl, childrenModelClass.rdfsClasses, fetch);
    // const urls = [...c_urls, ...i_urls]
    // console.log("🚀 ~ file: utils.ts:383 ~ urls:", urls)
    // return urls.map(url => SolidContainer.newInstance({ url }, true));
});
