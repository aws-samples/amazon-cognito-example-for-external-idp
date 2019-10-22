/**
 * A Pet
 */
export class Pet {

  constructor(
    public id?: string | null,
    public type?: string | null,
    public price?: number | null,
    public owner?: string | null,
    public ownerDisplayName?: string | null) {
  }
}
