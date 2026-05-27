import React from 'react';
import { Tab } from '@shadcn/ui';

const SettingsTab = () => {
  return (
    <Tab>
      <Tab.List>
        <Tab.Item>
          <Tab.Button>OG SETTINGS</Tab.Button>
        </Tab.Item>
      </Tab.List>
      <Tab.Panels>
        <Tab.Panel>
          {/* Settings tab content goes here */}
        </Tab.Panel>
      </Tab.Panels>
    </Tab>
  );
};

export default SettingsTab;
