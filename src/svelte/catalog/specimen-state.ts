import { getContext,setContext } from "svelte";
const key=Symbol("catalog-specimen-state");
export function provideSpecimenState(value:()=>string) { setContext(key,value); }
export function useSpecimenState() { return getContext<(()=>string)|undefined>(key); }
