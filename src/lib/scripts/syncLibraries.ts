import pb from '@/lib/pocketbase';
import { syncLibrary } from '@/lib/services/librarySync';
import cron from 'node-cron';
import { ServiceType } from '../types';

const synchronizeLibraries = async () => {
  try {
    const users = await pb.collection('users').getFullList(200, {
      sort: '-created',
    });

    for (const user of users) {
      const services = user.connectedServices || [];
      for (const service of services) {
        if (
          service.connected &&
          (service.id === 'spotify' ||
            service.id === 'apple-music' ||
            service.id === 'tidal')
        ) {
          try {
            await syncLibrary(user.id, service.id as ServiceType);
            console.log(
              `Successfully synced ${service.id} for user ${user.id}`
            );
          } catch (error) {
            console.error(
              `Failed to sync ${service.id} for user ${user.id}:`,
              error
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to retrieve users for synchronization:', error);
  }
};

// Schedule the sync to run every hour
cron.schedule('0 * * * *', () => {
  console.log('Starting library synchronization...');
  synchronizeLibraries();
});
