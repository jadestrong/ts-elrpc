import { SExpSymbol } from "ts-elparser";

export default function symbol(name: string) {
  return new SExpSymbol(name);
}
