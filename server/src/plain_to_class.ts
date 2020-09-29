/**
The MIT License

Copyright (c) 2015-2016 Umed Khudoiberdiev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
Copied from https://github.com/typestack/class-transformer.git
and concatenated into a single file with some type issues fixed and minor
tweaks.

If Reflect.getMetadata() is not found install the following:

    $ npm i --save @types/reflect-metadata

I feel that much of this code and complexity is unnecessary in my limited
usecase but I haven't yet cared enough to prune it.

--Riku R. 2020-04-05
*/

import 'reflect-metadata'

/**
 * Allows to specify a map of Types in the object without using @Type decorator.
 * This is useful when you have external classes.
 */
export interface TargetMap {

    /**
     * Target which Types are being specified.
     */
    target: Function;

    /**
     * List of properties and their Types.
     */
    properties: { [key: string]: Function };
}

/**
 * Options to be passed during transformation.
 */
export interface ClassTransformOptions {

    /**
     * Exclusion strategy. By default exposeAll is used, which means that it will expose all properties are transformed
     * by default.
     */
    strategy?: "excludeAll" | "exposeAll";

    /**
     * Indicates if extraneous properties should be excluded from the value when converting a plain value to a class.
     */
    excludeExtraneousValues?: boolean;

    /**
     * Only properties with given groups gonna be transformed.
     */
    groups?: string[];

    /**
     * Only properties with "since" > version < "until" gonna be transformed.
     */
    version?: number;

    /**
     * Excludes properties with the given prefixes. For example, if you mark your private properties with "_" and "__"
     * you can set this option's value to ["_", "__"] and all private properties will be skipped.
     * This works only for "exposeAll" strategy.
     */
    excludePrefixes?: string[];

    /**
     * If set to true then class transformer will ignore all @Expose and @Exclude decorators and what inside them.
     * This option is useful if you want to kinda clone your object but do not apply decorators affects.
     */
    ignoreDecorators?: boolean;

    /**
     * Target maps allows to set a Types of the transforming object without using @Type decorator.
     * This is useful when you are transforming external classes, or if you already have type metadata for
     * objects and you don't want to set it up again.
     */
    targetMaps?: TargetMap[];


    /**
     * If set to true then class transformer will perform a circular check. (circular check is turned off by default)
     * This option is useful when you know for sure that your types might have a circular dependency.
     */
    enableCircularCheck?: boolean;

    /**
     * If set to true then class transformer will try to convert properties implicitly to their target type based on their typing information.
     *
     * DEFAULT: `false`
     */
    enableImplicitConversion?: boolean;
}

export interface TransformOptions {
    since?: number;
    until?: number;
    groups?: string[];
    toClassOnly?: boolean;
    toPlainOnly?: boolean;
}

export interface TypeOptions {
    discriminator?: Discriminator;
    /**
     * Is false by default.
     */
    keepDiscriminatorProperty?: boolean;
}

export interface TypeHelpOptions {
    newObject: any;
    object: Object;
    property: string | undefined;
}

export interface ExposeOptions {
    name?: string;
    since?: number;
    until?: number;
    groups?: string[];
    toClassOnly?: boolean;
    toPlainOnly?: boolean;
}

export interface ExcludeOptions {
    toClassOnly?: boolean;
    toPlainOnly?: boolean;
}

export interface Discriminator {
    property: string;
    subTypes: JsonSubType[];
}

export interface JsonSubType {
    value: new (...args: any[]) => any;
    name: string;
}

export enum TransformationType {
    PLAIN_TO_CLASS,
    CLASS_TO_PLAIN,
    CLASS_TO_CLASS
}

export class ExcludeMetadata {

    constructor(public target: Function,
        public propertyName: string,
        public options: ExcludeOptions) {
    }

}

export class ExposeMetadata {

    constructor(public target: Function,
        public propertyName: string,
        public options: ExposeOptions) {
    }

}

export class TransformMetadata {

    constructor(public target: Function,
        public propertyName: string,
        public transformFn: (value: any, obj: any, transformationType: TransformationType) => any,
        public options: TransformOptions) {
    }

}

export class TypeMetadata {

    constructor(public target: Function,
        public propertyName: string,
        public reflectedType: any,
        public typeFunction: (options?: TypeHelpOptions) => Function,
        public options: TypeOptions) {
    }

}

/**
 * Storage all library metadata.
 */
export class MetadataStorage {

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    private _typeMetadatas = new Map<Function, Map<string, TypeMetadata>>();
    private _transformMetadatas = new Map<Function, Map<string, TransformMetadata[]>>();
    private _exposeMetadatas = new Map<Function, Map<string, ExposeMetadata>>();
    private _excludeMetadatas = new Map<Function, Map<string, ExcludeMetadata>>();
    private _ancestorsMap = new Map<Function, Function[]>();

    // -------------------------------------------------------------------------
    // Adder Methods
    // -------------------------------------------------------------------------

    addTypeMetadata(metadata: TypeMetadata) {
        if (!this._typeMetadatas.has(metadata.target)) {
            this._typeMetadatas.set(metadata.target, new Map<string, TypeMetadata>());
        }
        const temp = this._typeMetadatas.get(metadata.target)!.set(metadata.propertyName, metadata);
    }

    addTransformMetadata(metadata: TransformMetadata) {
        if (!this._transformMetadatas.has(metadata.target)) {
            this._transformMetadatas.set(metadata.target, new Map<string, TransformMetadata[]>());
        }
        if (!this._transformMetadatas.get(metadata.target)!.has(metadata.propertyName)) {
            this._transformMetadatas.get(metadata.target)!.set(metadata.propertyName, []);
        }
        this._transformMetadatas.get(metadata.target)!.get(metadata.propertyName)!.push(metadata);
    }

    addExposeMetadata(metadata: ExposeMetadata) {
        if (!this._exposeMetadatas.has(metadata.target)) {
            this._exposeMetadatas.set(metadata.target, new Map<string, ExposeMetadata>());
        }
        this._exposeMetadatas.get(metadata.target)!.set(metadata.propertyName, metadata);
    }

    addExcludeMetadata(metadata: ExcludeMetadata) {
        if (!this._excludeMetadatas.has(metadata.target)) {
            this._excludeMetadatas.set(metadata.target, new Map<string, ExcludeMetadata>());
        }
        this._excludeMetadatas.get(metadata.target)!.set(metadata.propertyName, metadata);
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    findTransformMetadatas(target: Function, propertyName: string, transformationType: TransformationType): TransformMetadata[] {
        return this.findMetadatas(this._transformMetadatas, target, propertyName)
            .filter(metadata => {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;

                if (metadata.options.toClassOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_PLAIN;
                }

                return true;
            });
    }

    findExcludeMetadata(target: Function, propertyName: string): ExcludeMetadata {
        return this.findMetadata(this._excludeMetadatas, target, propertyName)!;
    }

    findExposeMetadata(target: Function, propertyName: string): ExposeMetadata {
        return this.findMetadata(this._exposeMetadatas, target, propertyName)!;
    }

    findExposeMetadataByCustomName(target: Function, name: string): ExposeMetadata {
        return this.getExposedMetadatas(target).find(metadata => {
            return metadata.options && metadata.options.name === name;
        })!;
    }

    findTypeMetadata(target: Function, propertyName: string) {
        return this.findMetadata(this._typeMetadatas, target, propertyName);
    }

    getStrategy(target: Function): "excludeAll" | "exposeAll" | "none" {
        const excludeMap = this._excludeMetadatas.get(target);
        const exclude = !!excludeMap // && excludeMap.get(undefined); modern typescript this
        const exposeMap = this._exposeMetadatas.get(target);
        const expose = !!exposeMap // && exposeMap.get(undefined); modern typescript allow this
        if ((exclude && expose) || (!exclude && !expose)) return "none";
        return exclude ? "excludeAll" : "exposeAll";
    }

    getExposedMetadatas(target: Function): ExposeMetadata[] {
        return this.getMetadata(this._exposeMetadatas, target);
    }

    getExcludedMetadatas(target: Function): ExcludeMetadata[] {
        return this.getMetadata(this._excludeMetadatas, target);
    }

    getExposedProperties(target: Function, transformationType: TransformationType): string[] {
        return this.getExposedMetadatas(target)
            .filter(metadata => {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;

                if (metadata.options.toClassOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_PLAIN;
                }

                return true;
            })
            .map(metadata => metadata.propertyName);
    }

    getExcludedProperties(target: Function, transformationType: TransformationType): string[] {
        return this.getExcludedMetadatas(target)
            .filter(metadata => {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;

                if (metadata.options.toClassOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_CLASS || transformationType === TransformationType.PLAIN_TO_CLASS;
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === TransformationType.CLASS_TO_PLAIN;
                }

                return true;
            })
            .map(metadata => metadata.propertyName);
    }

    clear() {
        this._typeMetadatas.clear();
        this._exposeMetadatas.clear();
        this._excludeMetadatas.clear();
        this._ancestorsMap.clear();
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    private getMetadata<T extends { target: Function, propertyName: string }>(metadatas: Map<Function, Map<String, T>>, target: Function): T[] {
        const metadataFromTargetMap = metadatas.get(target);
        let metadataFromTarget: T[];
        if (metadataFromTargetMap) {
            metadataFromTarget = Array.from(metadataFromTargetMap.values()).filter(meta => meta.propertyName !== undefined);
        }

        let metadataFromAncestors: T[] = [];
        for (const ancestor of this.getAncestors(target)) {
            const ancestorMetadataMap = metadatas.get(ancestor);
            if (ancestorMetadataMap) {
                const metadataFromAncestor = Array.from(ancestorMetadataMap.values()).filter(meta => meta.propertyName !== undefined);
                metadataFromAncestors.push(...metadataFromAncestor);
            }
        }
        return metadataFromAncestors.concat(metadataFromTarget! || []);
    }

    private findMetadata<T extends { target: Function, propertyName: string }>(metadatas: Map<Function, Map<string, T>>, target: Function, propertyName: string): T | undefined {
        const metadataFromTargetMap = metadatas.get(target);
        if (metadataFromTargetMap) {
            const metadataFromTarget = metadataFromTargetMap.get(propertyName);
            if (metadataFromTarget) {
                return metadataFromTarget;
            }
        }
        for (const ancestor of this.getAncestors(target)) {
            const ancestorMetadataMap = metadatas.get(ancestor);
            if (ancestorMetadataMap) {
                const ancestorResult = ancestorMetadataMap.get(propertyName);
                if (ancestorResult) {
                    return ancestorResult;
                }
            }
        }
        return undefined;
    }

    private findMetadatas<T extends { target: Function, propertyName: string }>(metadatas: Map<Function, Map<string, T[]>>, target: Function, propertyName: string): T[] {
        const metadataFromTargetMap = metadatas.get(target);
        let metadataFromTarget: T[];
        if (metadataFromTargetMap) {
            metadataFromTarget = metadataFromTargetMap.get(propertyName)!;
        }
        let metadataFromAncestorsTarget: T[] = [];
        for (const ancestor of this.getAncestors(target)) {
            const ancestorMetadataMap = metadatas.get(ancestor);
            if (ancestorMetadataMap) {
                if (ancestorMetadataMap.has(propertyName)) {
                    metadataFromAncestorsTarget.push(...ancestorMetadataMap.get(propertyName)!);
                }
            }
        }
        return (metadataFromAncestorsTarget).reverse().concat((metadataFromTarget! || []).reverse());
    }

    private getAncestors(target: Function): Function[] {
        if (!target) return [];
        if (!this._ancestorsMap.has(target)) {
            let ancestors: Function[] = [];
            for (let baseClass = Object.getPrototypeOf(target.prototype.constructor);
                typeof baseClass.prototype !== "undefined";
                baseClass = Object.getPrototypeOf(baseClass.prototype.constructor)) {
                ancestors.push(baseClass);
            }
            this._ancestorsMap.set(target, ancestors);
        }
        return this._ancestorsMap.get(target)!;
    }
}

/**
 * Default metadata storage is used as singleton and can be used to storage all metadatas.
 */
export const defaultMetadataStorage = new MetadataStorage();
export class TransformOperationExecutor {

    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------

    private recursionStack = new Set<Object>();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private transformationType: TransformationType, private options: ClassTransformOptions) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    transform(source: Object | Object[] | any,
        value: Object | Object[] | any,
        targetType: Function | TypeMetadata | undefined,
        arrayType: Function | undefined,
        isMap: boolean | undefined,
        level: number = 0) {

        if (Array.isArray(value) || value instanceof Set) {
            const newValue = arrayType && this.transformationType === TransformationType.PLAIN_TO_CLASS ? instantiateArrayType(arrayType) : [];
            (value as any[]).forEach((subValue, index) => {
                const subSource = source ? source[index] : undefined;
                if (!this.options.enableCircularCheck || !this.isCircular(subValue)) {
                    let realTargetType;
                    if (typeof targetType !== "function" && targetType && targetType.options && targetType.options.discriminator && targetType.options.discriminator.property && targetType.options.discriminator.subTypes) {
                        if (this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                            realTargetType = targetType.options.discriminator.subTypes.find((subType) => subType.name === subValue[(targetType as { options: TypeOptions }).options.discriminator!.property]);
                            const options: TypeHelpOptions = { newObject: newValue, object: subValue, property: undefined };
                            const newType = targetType.typeFunction(options);
                            realTargetType === undefined ? realTargetType = newType : realTargetType = realTargetType.value;
                            if (!targetType.options.keepDiscriminatorProperty) delete subValue[targetType.options.discriminator.property];
                        }
                        if (this.transformationType === TransformationType.CLASS_TO_CLASS) {
                            realTargetType = subValue.constructor;
                        }
                        if (this.transformationType === TransformationType.CLASS_TO_PLAIN) {
                            subValue[targetType.options.discriminator.property] = targetType.options.discriminator.subTypes.find((subType) => subType.value === subValue.constructor)!.name;
                        }
                    } else {
                        realTargetType = targetType;
                    }
                    const value = this.transform(subSource, subValue, realTargetType, undefined, subValue instanceof Map, level + 1);

                    if (newValue instanceof Set) {
                        newValue.add(value);
                    } else {
                        newValue.push(value);
                    }
                } else if (this.transformationType === TransformationType.CLASS_TO_CLASS) {
                    if (newValue instanceof Set) {
                        newValue.add(subValue);
                    } else {
                        newValue.push(subValue);
                    }
                }
            });

            return newValue;
        } else if (targetType === String && !isMap) {
            if (value === null || value === undefined)
                return value;
            return String(value);

        } else if (targetType === Number && !isMap) {
            if (value === null || value === undefined)
                return value;
            return Number(value);

        } else if (targetType === Boolean && !isMap) {
            if (value === null || value === undefined)
                return value;
            return Boolean(value);

        } else if ((targetType === Date || value instanceof Date) && !isMap) {
            if (value instanceof Date) {
                return new Date(value.valueOf());
            }
            if (value === null || value === undefined)
                return value;
            return new Date(value);

        } else if (testForBuffer() && (targetType === Buffer || value instanceof Buffer) && !isMap) {
            if (value === null || value === undefined)
                return value;
            return Buffer.from(value);

        } else if (typeof value === "object" && value !== null) {

            // try to guess the type
            if (!targetType && value.constructor !== Object/* && TransformationType === TransformationType.CLASS_TO_PLAIN*/) targetType = value.constructor;
            if (!targetType && source) targetType = source.constructor;

            if (this.options.enableCircularCheck) {
                // add transformed type to prevent circular references
                this.recursionStack.add(value);
            }

            const keys = this.getKeys((targetType as Function), value);
            let newValue: any = source ? source : {};
            if (!source && (this.transformationType === TransformationType.PLAIN_TO_CLASS || this.transformationType === TransformationType.CLASS_TO_CLASS)) {

                if (isMap) {
                    newValue = new Map();
                } else if (targetType) {
                    newValue = new (targetType as any)();
                } else {
                    newValue = {};
                }
            }

            // traverse over keys
            for (let key of keys) {

                let valueKey = key, newValueKey = key, propertyName = key;
                if (!this.options.ignoreDecorators && targetType) {
                    if (this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                        const exposeMetadata = defaultMetadataStorage.findExposeMetadataByCustomName((targetType as Function), key);
                        if (exposeMetadata) {
                            propertyName = exposeMetadata.propertyName;
                            newValueKey = exposeMetadata.propertyName;
                        }

                    } else if (this.transformationType === TransformationType.CLASS_TO_PLAIN || this.transformationType === TransformationType.CLASS_TO_CLASS) {
                        const exposeMetadata = defaultMetadataStorage.findExposeMetadata((targetType as Function), key);
                        if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
                            newValueKey = exposeMetadata.options.name;
                        }
                    }
                }

                // get a subvalue
                let subValue: any = undefined;
                if (value instanceof Map) {
                    subValue = value.get(valueKey);
                } else if (value[valueKey] instanceof Function) {
                    subValue = value[valueKey]();
                } else {
                    subValue = value[valueKey];
                }

                // determine a type
                let type: any = undefined, isSubValueMap = subValue instanceof Map;
                if (targetType && isMap) {
                    type = targetType;

                } else if (targetType) {

                    const metadata = defaultMetadataStorage.findTypeMetadata((targetType as Function), propertyName);
                    if (metadata) {
                        const options: TypeHelpOptions = { newObject: newValue, object: value, property: propertyName };
                        const newType = metadata.typeFunction ? metadata.typeFunction(options) : metadata.reflectedType;
                        if (metadata.options && metadata.options.discriminator && metadata.options.discriminator.property && metadata.options.discriminator.subTypes) {
                            if (!(value[valueKey] instanceof Array)) {
                                if (this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                                    type = metadata.options.discriminator.subTypes.find((subType) => {
                                        if (subValue && metadata.options.discriminator!.property in subValue) {
                                            return subType.name === subValue[metadata.options.discriminator!.property]
                                        }
                                    });
                                    type === undefined ? type = newType : type = type.value;
                                    if (!metadata.options.keepDiscriminatorProperty) {
                                        if (subValue && metadata.options.discriminator.property in subValue) {
                                            delete subValue[metadata.options.discriminator.property];
                                        }
                                    }
                                }
                                if (this.transformationType === TransformationType.CLASS_TO_CLASS) {
                                    type = subValue.constructor;
                                }
                                if (this.transformationType === TransformationType.CLASS_TO_PLAIN) {
                                    subValue[metadata.options.discriminator.property] = metadata.options.discriminator.subTypes.find((subType) => subType.value === subValue.constructor)!.name;
                                }
                            } else {
                                type = metadata;
                            }
                        } else {
                            type = newType;
                        }
                        isSubValueMap = isSubValueMap || metadata.reflectedType === Map;
                    } else if (this.options.targetMaps) { // try to find a type in target maps

                        this.options.targetMaps
                            .filter(map => map.target === targetType && !!map.properties[propertyName])
                            .forEach(map => type = map.properties[propertyName]);
                    } else if (this.options.enableImplicitConversion && this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                        // if we have no registererd type via the @Type() decorator then we check if we have any
                        // type declarations in reflect-metadata (type declaration is emited only if some decorator is added to the property.)
                        const reflectedType = Reflect.getMetadata("design:type", (targetType as Function).prototype, propertyName);

                        if (reflectedType) {
                            type = reflectedType;
                        }
                    }
                }


                // if value is an array try to get its custom array type
                const arrayType = Array.isArray(value[valueKey]) ? this.getReflectedType((targetType as Function), propertyName) : undefined;

                // const subValueKey = TransformationType === TransformationType.PLAIN_TO_CLASS && newKeyName ? newKeyName : key;
                const subSource = source ? source[valueKey] : undefined;

                // if its deserialization then type if required
                // if we uncomment this types like string[] will not work
                // if (this.transformationType === TransformationType.PLAIN_TO_CLASS && !type && subValue instanceof Object && !(subValue instanceof Date))
                //     throw new Error(`Cannot determine type for ${(targetType as any).name }.${propertyName}, did you forget to specify a @Type?`);

                // if newValue is a source object that has method that match newKeyName then skip it
                if (newValue.constructor.prototype) {
                    const descriptor = Object.getOwnPropertyDescriptor(newValue.constructor.prototype, newValueKey);
                    if ((this.transformationType === TransformationType.PLAIN_TO_CLASS || this.transformationType === TransformationType.CLASS_TO_CLASS)
                        && ((descriptor && !descriptor.set) || newValue[newValueKey] instanceof Function)) //  || TransformationType === TransformationType.CLASS_TO_CLASS
                        continue;
                }

                if (!this.options.enableCircularCheck || !this.isCircular(subValue)) {
                    let transformKey = this.transformationType === TransformationType.PLAIN_TO_CLASS ? newValueKey : key;
                    let finalValue;

                    if (this.transformationType === TransformationType.CLASS_TO_PLAIN) {
                        // Get original value
                        finalValue = value[transformKey];
                        // Apply custom transformation
                        finalValue = this.applyCustomTransformations(finalValue, (targetType as Function), transformKey, value, this.transformationType);
                        // If nothing change, it means no custom transformation was applied, so use the subValue.
                        finalValue = (value[transformKey] === finalValue) ? subValue : finalValue;
                        // Apply the default transformation
                        finalValue = this.transform(subSource, finalValue, type, arrayType, isSubValueMap, level + 1);
                    } else {
                        finalValue = this.transform(subSource, subValue, type, arrayType, isSubValueMap, level + 1);
                        finalValue = this.applyCustomTransformations(finalValue, (targetType as Function), transformKey, value, this.transformationType);
                    }

                    if (newValue instanceof Map) {
                        newValue.set(newValueKey, finalValue);
                    } else {
                        newValue[newValueKey] = finalValue;
                    }
                } else if (this.transformationType === TransformationType.CLASS_TO_CLASS) {
                    let finalValue = subValue;
                    finalValue = this.applyCustomTransformations(finalValue, (targetType as Function), key, value, this.transformationType);
                    if (newValue instanceof Map) {
                        newValue.set(newValueKey, finalValue);
                    } else {
                        newValue[newValueKey] = finalValue;
                    }
                }

            }

            if (this.options.enableCircularCheck) {
                this.recursionStack.delete(value);
            }

            return newValue;

        } else {
            return value;
        }
    }

    private applyCustomTransformations(value: any, target: Function, key: string, obj: any, transformationType: TransformationType) {
        let metadatas = defaultMetadataStorage.findTransformMetadatas(target, key, this.transformationType);

        // apply versioning options
        if (this.options.version !== undefined) {
            metadatas = metadatas.filter(metadata => {
                if (!metadata.options)
                    return true;

                return this.checkVersion(metadata.options.since!, metadata.options.until!);
            });
        }

        // apply grouping options
        if (this.options.groups && this.options.groups.length) {
            metadatas = metadatas.filter(metadata => {
                if (!metadata.options)
                    return true;

                return this.checkGroups(metadata.options.groups!);
            });
        } else {
            metadatas = metadatas.filter(metadata => {
                return !metadata.options || !metadata.options.groups || !metadata.options.groups.length;
            });
        }

        metadatas.forEach(metadata => {
            value = metadata.transformFn(value, obj, transformationType);
        });

        return value;
    }

    // preventing circular references
    private isCircular(object: Object) {
        return this.recursionStack.has(object);
    }

    private getReflectedType(target: Function, propertyName: string) {
        if (!target) return undefined;
        const meta = defaultMetadataStorage.findTypeMetadata(target, propertyName);
        return meta ? meta.reflectedType : undefined;
    }

    private getKeys(target: Function, object: Object): string[] {

        // determine exclusion strategy
        let strategy = defaultMetadataStorage.getStrategy(target);
        if (strategy === "none")
            strategy = this.options.strategy || "exposeAll"; // exposeAll is default strategy

        // get all keys that need to expose
        let keys: any[] = [];
        if (strategy === "exposeAll") {
            if (object instanceof Map) {
                keys = Array.from(object.keys());
            } else {
                keys = Object.keys(object);
            }
        }

        if (!this.options.ignoreDecorators && target) {

            // add all exposed to list of keys
            let exposedProperties = defaultMetadataStorage.getExposedProperties(target, this.transformationType);
            if (this.transformationType === TransformationType.PLAIN_TO_CLASS) {
                exposedProperties = exposedProperties.map(key => {
                    const exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                    if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
                        return exposeMetadata.options.name;
                    }

                    return key;
                });
            }
            if (this.options.excludeExtraneousValues) {
                keys = exposedProperties;
            } else {
                keys = keys.concat(exposedProperties);
            }

            // exclude excluded properties
            const excludedProperties = defaultMetadataStorage.getExcludedProperties(target, this.transformationType);
            if (excludedProperties.length > 0) {
                keys = keys.filter(key => {
                    return excludedProperties.indexOf(key) === -1;
                });
            }

            // apply versioning options
            if (this.options.version !== undefined) {
                keys = keys.filter(key => {
                    const exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                    if (!exposeMetadata || !exposeMetadata.options)
                        return true;

                    return this.checkVersion(exposeMetadata.options.since!, exposeMetadata.options.until!);
                });
            }

            // apply grouping options
            if (this.options.groups && this.options.groups.length) {
                keys = keys.filter(key => {
                    const exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                    if (!exposeMetadata || !exposeMetadata.options)
                        return true;

                    return this.checkGroups(exposeMetadata.options.groups!);
                });
            } else {
                keys = keys.filter(key => {
                    const exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                    return !exposeMetadata || !exposeMetadata.options || !exposeMetadata.options.groups || !exposeMetadata.options.groups.length;
                });
            }
        }

        // exclude prefixed properties
        if (this.options.excludePrefixes && this.options.excludePrefixes.length) {
            keys = keys.filter(key => this.options.excludePrefixes!.every(prefix => {
                return key.substr(0, prefix.length) !== prefix;
            }));
        }

        // make sure we have unique keys
        keys = keys.filter((key, index, self) => {
            return self.indexOf(key) === index;
        });

        return keys;
    }

    private checkVersion(since: number, until: number) {
        let decision = true;
        if (decision && since)
            decision = this.options.version! >= since;
        if (decision && until)
            decision = this.options.version! < until;

        return decision;
    }

    private checkGroups(groups: string[]) {
        if (!groups)
            return true;

        return this.options.groups!.some(optionGroup => groups.indexOf(optionGroup) !== -1);
    }

}

function instantiateArrayType(arrayType: Function): Array<any> | Set<any> {
    const array = new (arrayType as any)();
    if (!(array instanceof Set) && !("push" in array)) {
        return [];
    }
    return array;
}

export function testForBuffer(): boolean {
    try {
        Buffer
        return true;
    } catch { }
    return false;
}

export type ClassType<T> = {
    new(...args: any[]): T;
};

export class ClassTransformer {

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Converts class (constructor) object to plain (literal) object. Also works with arrays.
     */
    classToPlain<T extends Object>(object: T, options?: ClassTransformOptions): Object;
    classToPlain<T extends Object>(object: T[], options?: ClassTransformOptions): Object[];
    classToPlain<T extends Object>(object: T | T[], options?: ClassTransformOptions): Object | Object[] {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, options || {});
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }

    /**
     * Converts class (constructor) object to plain (literal) object.
     * Uses given plain object as source object (it means fills given plain object with data from class object).
     * Also works with arrays.
     */
    classToPlainFromExist<T extends Object, P>(object: T, plainObject: P, options?: ClassTransformOptions): T;
    classToPlainFromExist<T extends Object, P>(object: T, plainObjects: P[], options?: ClassTransformOptions): T[];
    classToPlainFromExist<T extends Object, P>(object: T, plainObject: P | P[], options?: ClassTransformOptions): T | T[] {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_PLAIN, options || {});
        return executor.transform(plainObject, object, undefined, undefined, undefined, undefined);
    }

    /**
     * Converts plain (literal) object to class (constructor) object. Also works with arrays.
     */
    plainToClass<T extends Object, V extends Array<any>>(cls: ClassType<T>, plain: V, options?: ClassTransformOptions): T[];
    plainToClass<T extends Object, V>(cls: ClassType<T>, plain: V, options?: ClassTransformOptions): T;
    plainToClass<T extends Object, V>(cls: ClassType<T>, plain: V | V[], options?: ClassTransformOptions): T | T[] {
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, options || {});
        return executor.transform(undefined, plain, cls, undefined, undefined, undefined);
    }

    /**
     * Converts plain (literal) object to class (constructor) object.
     * Uses given object as source object (it means fills given object with data from plain object).
     * Also works with arrays.
     */
    plainToClassFromExist<T extends Object, V extends Array<any>>(clsObject: T, plain: V, options?: ClassTransformOptions): T;
    plainToClassFromExist<T extends Object, V>(clsObject: T, plain: V, options?: ClassTransformOptions): T[];
    plainToClassFromExist<T extends Object, V>(clsObject: T, plain: V | V[], options?: ClassTransformOptions): T | T[] {
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, options || {});
        return executor.transform(clsObject, plain, undefined, undefined, undefined, undefined);
    }

    /**
     * Converts class (constructor) object to new class (constructor) object. Also works with arrays.
     */
    classToClass<T>(object: T, options?: ClassTransformOptions): T;
    classToClass<T>(object: T[], options?: ClassTransformOptions): T[];
    classToClass<T>(object: T | T[], options?: ClassTransformOptions): T | T[] {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, options || {});
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }

    /**
     * Converts class (constructor) object to plain (literal) object.
     * Uses given plain object as source object (it means fills given plain object with data from class object).
     * Also works with arrays.
     */
    classToClassFromExist<T>(object: T, fromObject: T, options?: ClassTransformOptions): T;
    classToClassFromExist<T>(object: T, fromObjects: T[], options?: ClassTransformOptions): T[];
    classToClassFromExist<T>(object: T, fromObject: T | T[], options?: ClassTransformOptions): T | T[] {
        const executor = new TransformOperationExecutor(TransformationType.CLASS_TO_CLASS, options || {});
        return executor.transform(fromObject, object, undefined, undefined, undefined, undefined);
    }

    /**
     * Serializes given object to a JSON string.
     */
    serialize<T>(object: T, options?: ClassTransformOptions): string;
    serialize<T>(object: T[], options?: ClassTransformOptions): string;
    serialize<T>(object: T | T[], options?: ClassTransformOptions): string {
        return JSON.stringify(this.classToPlain(object, options));
    }

    /**
     * Deserializes given JSON string to a object of the given class.
     */
    deserialize<T>(cls: ClassType<T>, json: string, options?: ClassTransformOptions): T {
        const jsonObject: T = JSON.parse(json);
        return this.plainToClass(cls, jsonObject, options);
    }

    /**
     * Deserializes given JSON string to an array of objects of the given class.
     */
    deserializeArray<T>(cls: ClassType<T>, json: string, options?: ClassTransformOptions): T[] {
        const jsonObject: any[] = JSON.parse(json);
        return this.plainToClass(cls, jsonObject, options);
    }

}

/**
 * Defines a custom logic for value transformation.
 */
export function Transform(transformFn: (value: any, obj: any, transformationType: TransformationType) => any, options?: TransformOptions) {
    return function (target: any, key: string) {
        const metadata = new TransformMetadata(target.constructor, key, transformFn, options!);
        defaultMetadataStorage.addTransformMetadata(metadata);
    };
}

/**
 * Specifies a type of the property.
 * The given TypeFunction can return a constructor. A discriminator can be given in the options.
 */
export function Type(typeFunction?: (type?: TypeHelpOptions) => Function, options?: TypeOptions) {
    return function (target: any, key: string) {
        const type = (Reflect as any).getMetadata("design:type", target, key);
        const metadata = new TypeMetadata(target.constructor, key, type, typeFunction!, options!);
        defaultMetadataStorage.addTypeMetadata(metadata);
    };
}

/**
 * Marks property as included in the process of transformation. By default it includes the property for both
 * constructorToPlain and plainToConstructor transformations, however you can specify on which of transformation types
 * you want to skip this property.
 */
export function Expose(options?: ExposeOptions) {
    return function (object: Object | Function, propertyName?: string) {
        const metadata = new ExposeMetadata(object instanceof Function ? object : object.constructor, propertyName!, options || {});
        defaultMetadataStorage.addExposeMetadata(metadata);
    };
}

/**
 * Marks property as excluded from the process of transformation. By default it excludes the property for both
 * constructorToPlain and plainToConstructor transformations, however you can specify on which of transformation types
 * you want to skip this property.
 */
export function Exclude(options?: ExcludeOptions) {
    return function (object: Object | Function, propertyName?: string) {
        const metadata = new ExcludeMetadata(object instanceof Function ? object : object.constructor, propertyName!, options || {});
        defaultMetadataStorage.addExcludeMetadata(metadata);
    };
}

/**
 * Transform the object from class to plain object and return only with the exposed properties.
 */
export function TransformClassToPlain(params?: ClassTransformOptions): Function {

    return function (target: Function, propertyKey: string, descriptor: PropertyDescriptor) {
        const classTransformer: ClassTransformer = new ClassTransformer();
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const result: any = originalMethod.apply(this, args);
            const isPromise = !!result && (typeof result === "object" || typeof result === "function") && typeof result.then === "function";

            return isPromise ? result.then((data: any) => classTransformer.classToPlain(data, params)) : classTransformer.classToPlain(result, params);
        };
    };
}

/**
 * Return the class instance only with the exposed properties.
 */
export function TransformClassToClass(params?: ClassTransformOptions): Function {

    return function (target: Function, propertyKey: string, descriptor: PropertyDescriptor) {
        const classTransformer: ClassTransformer = new ClassTransformer();
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const result: any = originalMethod.apply(this, args);
            const isPromise = !!result && (typeof result === "object" || typeof result === "function") && typeof result.then === "function";

            return isPromise ? result.then((data: any) => classTransformer.classToClass(data, params)) : classTransformer.classToClass(result, params);
        };
    };
}

/**
 * Return the class instance only with the exposed properties.
 */
export function TransformPlainToClass(classType: any, params?: ClassTransformOptions): Function {

    return function (target: Function, propertyKey: string, descriptor: PropertyDescriptor) {
        const classTransformer: ClassTransformer = new ClassTransformer();
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const result: any = originalMethod.apply(this, args);
            const isPromise = !!result && (typeof result === "object" || typeof result === "function") && typeof result.then === "function";

            return isPromise ? result.then((data: any) => classTransformer.plainToClass(classType, data, params)) : classTransformer.plainToClass(classType, result, params);
        };
    };
}

const classTransformer = new ClassTransformer();

/**
 * Converts class (constructor) object to plain (literal) object. Also works with arrays.
 */
export function classToPlain<T>(object: T, options?: ClassTransformOptions): Object;
export function classToPlain<T>(object: T[], options?: ClassTransformOptions): Object[];
export function classToPlain<T>(object: T | T[], options?: ClassTransformOptions): Object | Object[] {
    return classTransformer.classToPlain(object, options);
}

/**
 * Converts class (constructor) object to plain (literal) object.
 * Uses given plain object as source object (it means fills given plain object with data from class object).
 * Also works with arrays.
 */
export function classToPlainFromExist<T>(object: T, plainObject: Object, options?: ClassTransformOptions): Object;
export function classToPlainFromExist<T>(object: T, plainObjects: Object[], options?: ClassTransformOptions): Object[];
export function classToPlainFromExist<T>(object: T, plainObject: Object | Object[], options?: ClassTransformOptions): Object | Object[] {
    return classTransformer.classToPlainFromExist(object, plainObject, options);
}

/**
 * Converts plain (literal) object to class (constructor) object. Also works with arrays.
 */
export function plainToClass<T, V>(cls: ClassType<T>, plain: V[], options?: ClassTransformOptions): T[];
export function plainToClass<T, V>(cls: ClassType<T>, plain: V, options?: ClassTransformOptions): T;
export function plainToClass<T, V>(cls: ClassType<T>, plain: V | V[], options?: ClassTransformOptions): T | T[] {
    return classTransformer.plainToClass(cls, plain as any, options);
}

/**
 * Converts plain (literal) object to class (constructor) object.
 * Uses given object as source object (it means fills given object with data from plain object).
 *  Also works with arrays.
 */
export function plainToClassFromExist<T, V>(clsObject: T[], plain: V[], options?: ClassTransformOptions): T[];
export function plainToClassFromExist<T, V>(clsObject: T, plain: V, options?: ClassTransformOptions): T;
export function plainToClassFromExist<T, V>(clsObject: T, plain: V | V[], options?: ClassTransformOptions): T | T[] {
    return classTransformer.plainToClassFromExist(clsObject, plain, options);
}

/**
 * Converts class (constructor) object to new class (constructor) object. Also works with arrays.
 */
export function classToClass<T>(object: T, options?: ClassTransformOptions): T;
export function classToClass<T>(object: T[], options?: ClassTransformOptions): T[];
export function classToClass<T>(object: T | T[], options?: ClassTransformOptions): T | T[] {
    return classTransformer.classToClass(object, options);
}

/**
 * Converts class (constructor) object to plain (literal) object.
 * Uses given plain object as source object (it means fills given plain object with data from class object).
 * Also works with arrays.
 */
export function classToClassFromExist<T>(object: T, fromObject: T, options?: ClassTransformOptions): T;
export function classToClassFromExist<T>(object: T, fromObjects: T[], options?: ClassTransformOptions): T[];
export function classToClassFromExist<T>(object: T, fromObject: T | T[], options?: ClassTransformOptions): T | T[] {
    return classTransformer.classToClassFromExist(object, fromObject, options);
}

/**
 * Serializes given object to a JSON string.
 */
export function serialize<T>(object: T, options?: ClassTransformOptions): string;
export function serialize<T>(object: T[], options?: ClassTransformOptions): string;
export function serialize<T>(object: T | T[], options?: ClassTransformOptions): string {
    return classTransformer.serialize(object, options);
}

/**
 * Deserializes given JSON string to a object of the given class.
 */
export function deserialize<T>(cls: ClassType<T>, json: string, options?: ClassTransformOptions): T {
    return classTransformer.deserialize(cls, json, options);
}

/**
 * Deserializes given JSON string to an array of objects of the given class.
 */
export function deserializeArray<T>(cls: ClassType<T>, json: string, options?: ClassTransformOptions): T[] {
    if (!options)
        options = { enableImplicitConversion: true };

    return classTransformer.deserializeArray(cls, json, options);
}
