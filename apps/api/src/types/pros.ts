/** Query of GET /api/v1/pros/count: what the visitor searched on the landing site. */
export type ProCountQuery = {
  /** The trade, in any language the taxonomy knows ("Plombier", "plumber", "سباك"). */
  service: string;
  /** The city ("Sousse", "سوسة"). */
  city: string;
};

export type ProCountResponse = {
  service: string;
  city: string;
  /** Active professionals offering this trade in this city. */
  count: number;
};
