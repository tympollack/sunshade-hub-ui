import { createSSRClient } from '../../../utils/supabase/server';
import FlagsClient from './FlagsClient';
import type { HubFeatureFlag } from '../../../lib/services/featureFlagsService';
import { DEFAULT_HUB_FEATURE_FLAGS } from '../../../lib/services/featureFlagsService';

export const metadata = {
  title: 'Feature Flags & Card Visibility | Admin Gateway',
};

const INITIAL_FLAGS_FALLBACK: HubFeatureFlag[] = [
  {
    key: 'card_dartup',
    name: 'Dart Up! Launchpad Card',
    description: 'Display Dart Up! in the SunShade Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_dartup ?? true,
  },
  {
    key: 'card_wsw',
    name: 'War: Second Wind Launchpad Card',
    description: 'Display War: Second Wind in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_wsw ?? true,
  },
  {
    key: 'card_pukhuk',
    name: 'Puk Huk Launchpad Card',
    description: 'Display Puk Huk in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_pukhuk ?? true,
  },
  {
    key: 'card_cozy',
    name: 'Cozy Launchpad Card',
    description: 'Display Cozy in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_cozy ?? true,
  },
  {
    key: 'card_patchwork',
    name: 'PatchWork Launchpad Card',
    description: 'Display PatchWork in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_patchwork ?? true,
  },
  {
    key: 'card_valerie',
    name: 'Project Valerie Launchpad Card',
    description: 'Display Project Valerie in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_valerie ?? true,
  },
  {
    key: 'card_makerverse',
    name: 'Makerverse Launchpad Card',
    description: 'Display Makerverse in the Ecosystem Launchpad showcase',
    category: 'card',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.card_makerverse ?? true,
  },
  {
    key: 'widget_dartup',
    name: 'Dart Up! Widget',
    description: 'Mount the real-time Dart Up! pilot telemetry and launch widget on the Hub Overview',
    category: 'widget',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.widget_dartup ?? true,
  },
  {
    key: 'widget_chess',
    name: 'SunShade Chess Widget',
    description: 'Mount the SunShade Chess match history and stats widget on the Hub Overview',
    category: 'widget',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.widget_chess ?? true,
  },
  {
    key: 'widget_ecosystem_log',
    name: 'Ecosystem Log Widget',
    description: 'Mount the network activity and log widget on the Hub Overview',
    category: 'widget',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.widget_ecosystem_log ?? true,
  },
  {
    key: 'showcase_launchpad',
    name: 'Ecosystem Launchpad Section',
    description: 'Display the entire SunShade Ecosystem Launchpad directory',
    category: 'system',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.showcase_launchpad ?? true,
  },
  {
    key: 'connected_services',
    name: 'Connected Services Directory',
    description: 'Display the Connected SunShade Services grid on the Hub Overview',
    category: 'system',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.connected_services ?? true,
  },
  {
    key: 'guest_launch',
    name: 'Guest Mode Launching',
    description: 'Allow guest and unauthenticated visitors to launch games and civic utilities',
    category: 'system',
    enabled: DEFAULT_HUB_FEATURE_FLAGS.guest_launch ?? true,
  },
];

export default async function AdminFlagsPage() {
  const supabase = await createSSRClient();

  const { data: dbFlags, error } = await supabase
    .from('hub_feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  if (error) {
    console.warn('[AdminFlagsPage] hub_feature_flags lookup fallback to default seed:', error.message);
  }

  // Merge DB flags with fallback list to ensure all system keys are always manageable
  const flagsMap = new Map<string, HubFeatureFlag>();
  INITIAL_FLAGS_FALLBACK.forEach((f) => flagsMap.set(f.key, f));
  if (dbFlags && Array.isArray(dbFlags)) {
    dbFlags.forEach((f) => flagsMap.set(f.key, f as HubFeatureFlag));
  }

  const flags = Array.from(flagsMap.values());

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Feature Flags & Card Visibility</h1>
        <p className="text-sm text-zinc-400">
          Control Launchpad app card visibility, mount/unmount dashboard widgets, and toggle Hub runtime parameters in real-time without redeploying code.
        </p>
      </div>

      <FlagsClient initialFlags={flags} />
    </div>
  );
}
