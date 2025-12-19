interface Feature {
  featureFlag: string
  added: string
  team: string
}

export const Features = {
  AFP_LIVSVARIG_MED_VURDERING: {
    featureFlag: 'pesys.alde.afp.livsvarig.vurdering',
    added: '2025-12-18',
    team: 'starte-pensjon',
  },
} satisfies Record<string, Feature>
