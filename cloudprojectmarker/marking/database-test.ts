import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";

import * as chai from "chai";
import * as chaiSubset from "chai-subset";
chai.use(chaiSubset);

describe("Database", () => {
  const rds: AWS.RDS = new AWS.RDS();
  const secretsManager: AWS.SecretsManager = new AWS.SecretsManager();
  const ec2: AWS.EC2 = new AWS.EC2();

  it("should have one secret.", async () => {
    const secrets = await secretsManager.listSecrets().promise();
    const dbSecret = secrets.SecretList!.find((s) =>
      s.Name!.startsWith("AuroraServerlessMasterUser")
    );
    // console.log(dbSecret);
    const value = await secretsManager
      .getSecretValue({ SecretId: dbSecret!.ARN! })
      .promise();
    // console.log(value);
    const expected = {
      engine: "mysql",
      port: 3306,
      username: "dbroot",
    };

    expect(
      JSON.parse(value.SecretString!),
      "secret for mysql."
    ).to.containSubset(expected);
  });
  it("should be Aurora MySQL Serverless.", async () => {
    const dBClusters = await rds
      .describeDBClusters({
        Filters: [{ Name: "db-cluster-id", Values: ["cloudprojectdatabase"] }],
      })
      .promise();
    //console.log(dBClusters.DBClusters![0]);

    const dbCluster = dBClusters.DBClusters![0];

    const expected = {
      AllocatedStorage: 1,
      BackupRetentionPeriod: 1,
      DBClusterIdentifier: "cloudprojectdatabase",
      DBClusterParameterGroup: "default.aurora5.6",
      Status: "available",
      CustomEndpoints: [],
      MultiAZ: false,
      Engine: "aurora",
      Port: 3306,
      MasterUsername: "dbroot",
      DBClusterOptionGroupMemberships: [],
      ReadReplicaIdentifiers: [],
      DBClusterMembers: [],
      StorageEncrypted: true,
      AssociatedRoles: [],
      IAMDatabaseAuthenticationEnabled: false,
      EnabledCloudwatchLogsExports: [],
      Capacity: 0,
      EngineMode: "serverless",
      ScalingConfigurationInfo: {
        MinCapacity: 1,
        MaxCapacity: 16,
        AutoPause: true,
        SecondsUntilAutoPause: 300,
        TimeoutAction: "RollbackCapacityChange",
      },
      DeletionProtection: false,
      HttpEndpointEnabled: false,
      ActivityStreamStatus: "stopped",
      CopyTagsToSnapshot: false,
      CrossAccountClone: false,
      DomainMemberships: [],
    };

    expect(dbCluster, "Aurora Serverless Settings.").to.containSubset(expected);
    const dbSubnetGroups = await rds
      .describeDBSubnetGroups({ DBSubnetGroupName: dbCluster.DBSubnetGroup })
      .promise();
    //console.log(dbSubnetGroups.DBSubnetGroups![0]);
    const dbSubnetGroup = dbSubnetGroups.DBSubnetGroups![0];

    expect(2, "uses 2 subnets.").to.eq(dbSubnetGroup.Subnets!.length);

    const subnets = await ec2
      .describeSubnets({
        Filters: [
          {
            Name: "subnet-id",
            Values: dbSubnetGroup.Subnets!.map((c) => c.SubnetIdentifier!),
          },
        ],
      })
      .promise();
    //console.log(subnets.Subnets);
    expect(
      subnets.Subnets![0].AvailabilityZone,
      "uses 2 subnets in different AZ"
    ).to.not.eq(subnets.Subnets![1].AvailabilityZone);

    expect(subnets.Subnets![0].CidrBlock!, "private subnet.").to.contain("/22");
    expect(subnets.Subnets![1].CidrBlock!, "private subnet.").to.contain("/22");
  });
});
