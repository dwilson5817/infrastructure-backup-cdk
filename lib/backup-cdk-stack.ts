import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BlockPublicAccess, Bucket, ObjectOwnership, StorageClass } from "aws-cdk-lib/aws-s3";
import { AccessKey, Group, User } from "aws-cdk-lib/aws-iam";
import { machinesToBackup } from "./constants";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class BackupCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backupIamGroup = new Group(this, 'BackupGroup');

    machinesToBackup.forEach(machineToBackup => {
      const backupBucket = new Bucket(this, `${machineToBackup}BackupBucket`, {
        objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [{
          expiration: cdk.Duration.days(180),
          transitions: [
          {
            storageClass: StorageClass.DEEP_ARCHIVE,
            transitionAfter: cdk.Duration.days(3)
          }]
        }]
      });

      const backupIamUser = new User(this, `${machineToBackup}Backup`);

      backupIamUser.addToGroup(backupIamGroup);
      backupBucket.grantReadWrite(backupIamUser);

      const accessKey = new AccessKey(this, `${machineToBackup}AccessKey`, {
        user: backupIamUser
      });

      new Secret(this, `${machineToBackup}Secret`, {
          secretStringValue: accessKey.secretAccessKey,
      });
    });

    const archiveBucket = new Bucket(this, `ArchiveBucket`, {
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    const archiveIamUser = new User(this, `ArchiveUser`);

    archiveIamUser.addToGroup(backupIamGroup);
    archiveBucket.grantReadWrite(archiveIamUser);

    const accessKey = new AccessKey(this, `ArchiveAccessKey`, {
      user: archiveIamUser
    });

    new Secret(this, `ArchiveSecret`, {
        secretStringValue: accessKey.secretAccessKey,
    });
  }
}
