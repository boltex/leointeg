export const enum RevealType {
    NoReveal = 0,
    Reveal,
    RevealSelect,
    RevealSelectFocus,
    RevealSelectFocusShowBody
}

export interface LeoAction { // pushed and resolved as a stack
    parameter: string; // to pass along with action to python's side
    deferredPayload?: any | undefined; // Used when the action already has a return value ready but is also waiting for python's side
    resolveFn: (result: any) => void; // call that with an answer from python's (or other) side
    rejectFn: (reason: any) => void; // call if problem is encountered
}

export interface ArchivedPosition { // * from Leo's leoflexx.py
    hasBody: boolean;     // bool(p.b),
    hasChildren: boolean; // p.hasChildren()
    childIndex: number;   // p._childIndex
    cloned: boolean;      // p.isCloned()
    dirty: boolean;       // p.isDirty()
    expanded: boolean;    // p.isExpanded()
    gnx: string;          // p.v.gnx
    level: number;        // p.level()
    headline: string;     // p.h
    marked: boolean;      // p.isMarked()
    selected: boolean;    // p == commander.p
    stack: {
        gnx: string;        // stack_v.gnx
        childIndex: number; // stack_childIndex
        headline: string;   // stack_v.h
    }[];                  // for (stack_v, stack_childIndex) in p.stack]
}

export interface LeoBridgePackage {
    id: number;
    [key: string]: any;
}