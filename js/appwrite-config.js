// Appwrite configuration
const appwriteConfig = {
    endpoint: 'https://cloud.appwrite.io/v1', // Updated to cloud endpoint
    projectId: '690917f00018f1cd98cc', // Replace with your project ID
    databaseId: '690919e50017183b4baa', // Replace with your database ID
};

const client = new Appwrite.Client();
client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);

// Import ID utility
const { ID } = Appwrite;

// Make Appwrite services globally available
window.account = new Appwrite.Account(client);
window.databases = new Appwrite.Databases(client);
window.storage = new Appwrite.Storage(client);
window.ID = ID;
