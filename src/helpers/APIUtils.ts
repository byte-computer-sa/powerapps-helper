import * as vscode from 'vscode';
import * as axios from 'axios';
import * as uuid from 'uuid';
import * as util from 'util';
import * as stream from 'stream';
import * as xml2js from 'xml2js';
import { Settings } from "./Settings";
import { OAuthUtils } from "./OAuthUtils";
import { PowerApp } from '../entities/PowerApp';
import {Environment} from '../entities/Environment';
import { Solution } from '../entities/Solution';
import { SolutionComponent } from '../entities/SolutionComponent';
import { ComponentType } from '../entities/ComponentType';
import { promises as fsPromises } from 'fs'; 
import { Utils } from './Utils';
import { SolutionUtils } from './SolutionUtils';
import { PowerAppsAPI } from '../entities/PowerAppsAPI';
import promise = require('glob-promise');
import { resolve } from 'dns';

export class APIUtils {

    /**
     * Get the Environments from API (https://docs.microsoft.com/en-us/connectors/powerappsforappmakers/#get-environments)
     * @param convert - callback to convert the results to a PowerAppVersions
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     */
    public static async getEnvironments<T>(
        convert: (ti: any) => T,         
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined) : Promise<T[]>
    {
        var url = "https://api.powerapps.com/providers/Microsoft.PowerApps/environments/?api-version=2020-07-01";
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getPowerAppAPIToken());
    }

    /**
     * Get the PowerApps from API (https://docs.microsoft.com/en-us/connectors/powerappsforappmakers/#get-apps)
     * @param convert - callback to convert the results to a PowerAppVersions
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     */
    public static async getPowerApps<T>(
        convert: (ti: any) => T,         
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined) : Promise<T[]>
    {
        var url = "https://api.powerapps.com/providers/Microsoft.PowerApps/apps/?api-version=2020-07-01&$expand=unpublishedAppDefinition";
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getPowerAppAPIToken());
    }

    /**
     * Get the Versions of a PowerApp from API (https://docs.microsoft.com/en-us/connectors/powerappsforappmakers/#get-app-versions)
     * @param app (mandatory) - The PowerApp name
     * @param convert - callback to convert the results to a PowerAppVersions
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     */
    public static async getPowerAppVersions<T>(
        app: string,
        convert: (ti: any) => T,         
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined) : Promise<T[]>
    {
        var url = `https://api.powerapps.com/providers/Microsoft.PowerApps/apps/${app}/versions?api-version=2020-07-01`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getPowerAppAPIToken());
    }

    /**
     * Get the PowerApps API from API (https://docs.microsoft.com/en-us/connectors/powerappsforadmins/#get-custom-connectors-as-admin)
     * @param environment (mandatory) - The PowerApps Environment name
     * @param convert - callback to convert the results to a PowerAppVersions
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     */
     public static async getPowerAppsAPIs<T>(
        environment: Environment,
        convert: (ti: any) => T,         
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined) : Promise<T[]>
    {
        var url = `https://api.powerapps.com/providers/Microsoft.PowerApps/apis/?$filter=environment%20eq%20%27${environment.name}%27&api-version=2020-07-01`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getPowerAppAPIToken());
    }

    /**
     * Get the PowerApps API from API (https://docs.microsoft.com/en-us/connectors/powerappsforadmins/#get-custom-connectors-as-admin)
     * @param environment (mandatory) - The PowerApps Environment name
     * @param connector (mandatory) - The PowerApps API name
     * @param convert - callback to convert the results to a PowerAppVersions
     */
     public static async getPowerAppsAPI<T>(
        environment: Environment,
        connector: string,
        convert: (ti: any) => T,
        bearerToken?: string | undefined) : Promise<T | undefined>
    {
        var url = `https://api.powerapps.com/providers/Microsoft.PowerApps/apis/${connector || ''}?$filter=environment%20eq%20%27${environment.name}%27&api-version=2020-07-01`;
        return await Utils.getWithReturnSingle<T>(url, convert, bearerToken || await OAuthUtils.getPowerAppAPIToken());
    }

    /**
     * Update the PowerApps API from API (https://docs.microsoft.com/en-us/connectors/powerappsforadmins/#get-custom-connectors-as-admin)
     * @param environment (mandatory) - The PowerApps Environment name
     * @param connector (mandatory) - The PowerApps API name
     * @param properties (mandatory) - The PowerApps API properties
     */
     public static async updatePowerAppsAPI(
        environment: Environment,
        connector: string,
        properties: any,
        bearerToken?: string | undefined) : Promise<any | undefined>
    {
        var url = `https://api.powerapps.com/providers/Microsoft.PowerApps/apis/${connector || ''}?$filter=environment%20eq%20%27${environment.name}%27&api-version=2020-07-01`;
        
        // eslint-disable-next-line @typescript-eslint/naming-convention
        var headers:any = { 'Content-Type': 'application/json' };
        if (bearerToken !== undefined) {
            headers.Authorization = `Bearer ${bearerToken}`;
        }
        var response = await axios.default.patch(url, properties, {
            headers: headers
        });
        return response.data;
    }

    /**
     * Get the Solutions from Dynamics 365 API (https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/solutions)
     * @param uri (mandatory) - The Dynamics 365 API URI
     * @param convert - callback to convert the results
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     */
    public static async getSolutions<T>(
        uri: string,
        convert: (ti: any) => T,         
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined) : Promise<T[]>
    {
        var url = `${uri}/api/data/v9.1/solutions?$filter=${encodeURI('isvisible eq true')}`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getCrmToken(uri));
    }

    /**
     * Get the Connectors from Dynamics 365 API (https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/connectors)
     * @param uri (mandatory) - The Dynamics 365 API URI
     * @param convert - callback to convert the results
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     * @param solutionId - the optional solutionId
     */
     public static async getConnectors<T>(
        uri: string,
        convert: (ti: any) => T, 
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined,
        solutionId?: string | undefined) : Promise<T[]>
    {
        var filters = [];
        if (solutionId) {
            var flowComponents = await APIUtils.getSolutionComponents(uri, SolutionComponent.convert, undefined, undefined, undefined, solutionId, ComponentType.customConnector);
            if (flowComponents.length > 0) {
                filters.push(flowComponents.map(component => `(connectorid eq ${component.objectId})`).join(' or '));
            }
            var flowComponents = await APIUtils.getSolutionComponents(uri, SolutionComponent.convert, undefined, undefined, undefined, solutionId, ComponentType.connector);
            if (flowComponents.length > 0) {
                filters.push(flowComponents.map(component => `(connectorid eq ${component.objectId})`).join(' or '));
            }
            if (filters.length <= 0) {
                return [];
            }            
        }
        var url = `${uri}/api/data/v9.1/connectors${filters.length > 0 ? '?$filter=' + encodeURI(filters.join(' and ')): ''}`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getCrmToken(uri));
    }
    
    /**
     * Get the Cloud (Modern) Flows from Dynamics 365 API (https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/workflow)
     * @param uri (mandatory) - The Dynamics 365 API URI
     * @param convert - callback to convert the results
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     * @param solutionId - the optional solutionId
     */
     public static async getCloudFlows<T>(
        uri: string,
        convert: (ti: any) => T, 
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined,
        solutionId?: string | undefined) : Promise<T[]>
    {
        var filters = [];
        filters.push('(category eq 5)');
        if (solutionId) {
            const flowComponents = await APIUtils.getSolutionComponents(uri, SolutionComponent.convert, undefined, undefined, undefined, solutionId, ComponentType.workFlow);
            if (flowComponents.length <= 0) {
                return [];
            }
            filters.push(flowComponents.map(component => `(workflowid eq ${component.objectId})`).join(' or '));                        
        }
        var url = `${uri}/api/data/v9.1/workflows${filters.length > 0 ? '?$filter=' + encodeURI(filters.join(' and ')): ''}`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getCrmToken(uri));
    }

    /**
     * Get the Canvas Apps from Dynamics 365 API (https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/workflow)
     * @param uri (mandatory) - The Dynamics 365 API URI
     * @param convert - callback to convert the results
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     * @param solutionId - the optional solutionId
     */
     public static async getCanvasApps<T>(
        uri: string,
        convert: (ti: any) => T, 
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined,
        solutionId?: string | undefined) : Promise<T[]>
    {
        var filters = [];
        if (solutionId) {
            const flowComponents = await APIUtils.getSolutionComponents(uri, SolutionComponent.convert, undefined, undefined, undefined, solutionId, ComponentType.canvasApp);
            if (flowComponents.length <= 0) {
                return [];
            }
            filters.push(flowComponents.map(component => `(canvasappid eq ${component.objectId})`).join(' or '));
        }
        var url = `${uri}/api/data/v9.1/canvasapps${filters.length > 0 ? '?$filter=' + encodeURI(filters.join(' and ')): ''}`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getCrmToken(uri));
    }

    /**
     * Get the Solution Components from Dynamics 365 API (https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/workflow)
     * @param uri (mandatory) - The Dynamics 365 API URI
     * @param convert - callback to convert the results
     * @param sort - callback to sort results
     * @param filter - callback to filter results
     * @param solutionId - the optional solutionId
     */
     public static async getSolutionComponents<T>(
        uri: string,
        convert: (ti: any) => T, 
        sort?: ((t1: T, t2: T) => number) | undefined, 
        filter?: ((t1: T) => boolean) | undefined,
        bearerToken?: string | undefined,
        solutionId?: string | undefined,
        componentType?: ComponentType) : Promise<T[]>
    {
        var filters = [];
        if (solutionId) {
            filters.push(`(_solutionid_value eq ${solutionId})`);
        }
        if (componentType) {
            filters.push(`(componenttype eq ${componentType})`);
        }
        var url = `${uri}/api/data/v9.1/solutioncomponents?$select=objectid,componenttype${filters.length > 0 ? '&$filter=' + encodeURI(filters.join(' and ')): ''}`;
        return await Utils.getWithReturnArray<T>(url, convert, sort, filter, bearerToken || await OAuthUtils.getCrmToken(uri));
    }
    






    /**
     * Download and Unpack a PowerApp
     * @param app - The PowerApp to download
     */
    public static async downloadAndUnpackPowerApp(app: PowerApp): Promise<void> {
        const id: string = uuid.v4();
        const fs = require('fs');
        let rootPath = vscode.workspace.rootPath;
        if (rootPath === undefined) {
            vscode.window.showErrorMessage('Please open a Folder or Workspace!');
            return;
        } 
        const filePath = `${rootPath}/${id}.msapp`;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Download and Unpack Power App ${app.displayName}`,
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, token: vscode.CancellationToken): Promise<void> => {
            
            try {
                const file: NodeJS.WritableStream = fs.createWriteStream(filePath);
                const response = await axios.default.get(app.downloadUrl, {responseType: 'stream'});
                
                const finished = util.promisify(stream.finished);            
                await response.data.pipe(file);
                await finished(file);
                await file.end();
                if (! await Utils.checkSourceFileUtility()) { return; }
                const cmd = `${Settings.sourceFileUtility()} -unpack "${filePath}" "${rootPath}/${Settings.sourceFolder()}/CanvasApps/${app.displayName.toLowerCase().replace(/[^a-z0-9]/gi, '')}_msapp_src"`;
                await Utils.executeChildProcess(cmd);

                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    vscode.window.showErrorMessage(`${err}`);
                }
            } catch (err: any) {
                vscode.window.showErrorMessage(`${err}`);
            }
            vscode.window.showInformationMessage(`Power App ${app.displayName} downloaded.`);  
            return new Promise(resolve=>resolve());
        });
    }

    /**
     * Download and Unpack a Solution
     * @param solution - The Solution to download
     */
    public static async downloadAndUnpackSolution(solution: Solution): Promise<void> {
        const id: string = uuid.v4();
        const fs = require('fs');
        const unzip = require('unzip-stream');
        let rootPath = vscode.workspace.rootPath;
        if (rootPath === undefined) {
            vscode.window.showErrorMessage('Please open a Folder or Workspace!');
            return;
        } 
        const filePath = `${rootPath}/${id}.zip`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Download and Unpack solution`,
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, token: vscode.CancellationToken): Promise<void> => {
            
            try {
                progress.report({message: `Start downloading solution ${solution.name} from ${solution.environment.displayName}`});
                const bearerToken = await OAuthUtils.getCrmToken(solution.environment.instanceApiUrl);
                const url         = `${solution.environment.instanceApiUrl}/api/data/v9.1/ExportSolution`;
                // eslint-disable-next-line @typescript-eslint/naming-convention
                var headers : any = { 'Content-Type': 'application/json',       'Authorization': `Bearer ${bearerToken}` };
                // eslint-disable-next-line @typescript-eslint/naming-convention
                var data    : any = { 'SolutionName': `${solution.uniqueName}`, 'Managed':       solution.isManaged };
                var response = await axios.default.post(url, data, {
                    headers: headers
                });
                
                const file: NodeJS.WritableStream = fs.createWriteStream(filePath);
                const bytes    = Buffer.from(response.data.ExportSolutionFile, 'base64');
                
                await file.write(bytes);
                await file.end();
                
                progress.report({message: `Unpack solution to workspace to: "${rootPath}/${Settings.sourceFolder()}"`});
                var zip = fs.createReadStream(filePath);
                const finished = util.promisify(stream.finished);            
                await zip.pipe(unzip.Extract({ path: `${rootPath}/${Settings.sourceFolder()}` }));
                await finished(zip);
                                
                progress.report({message: `Prettify JSON files...`});
                var glob = require("glob-promise");
                var files = await glob.promise(`${rootPath}/${Settings.sourceFolder()}/**/*.json`, {});
                await Promise.all(files.map(async (filename:string) => await Utils.prettifyJson(filename, filename) ));

                progress.report({message: `Prettify XML files...`});
                var files = await glob.promise(`${rootPath}/${Settings.sourceFolder()}/**/[Content_Types].xml`, {});
                await Promise.all(files.map(async (filename:string) => await Utils.prettifyXml(filename, filename) ));

                progress.report({message: `Unpack Canvas Apps...`});
                var files = await glob.promise(`${rootPath}/${Settings.sourceFolder()}/**/*.msapp`, {});
                await Promise.all(files.map(async (filename:string) => {
                    const unpackedPath = `${filename}`.replace(".msapp", "_msapp_src");
                    var   result       = await SolutionUtils.unpackPowerApp(filename, unpackedPath, (result) => progress.report({message: result}));
                    if (result) 
                    {
                        fs.unlinkSync(filename);
                    }
                }));

                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    vscode.window.showErrorMessage(`${err}`);
                }

                vscode.window.showInformationMessage(`Solution ${solution.name} downloaded.`);            
            } catch (err: any) {
                vscode.window.showErrorMessage(`${err}`);
            }
            return new Promise(resolve=>resolve());
        });
    }



    /*
    IMPORT SOLUTION
    https://github.com/MicrosoftDocs/power-automate-docs/blob/live/articles/web-api.md#import-flows
    POST https://org00000000.crm0.dynamics.com/api/data/v9.1/ImportSolution
    Accept: application/json
    Authorization: Bearer ey...
    Content-type: application/json
    {
        "OverwriteUnmanagedCustomizations": false,
        "PublishWorkflows" : true,
        "ImportJobId" : "00000000-0000-0000-0000-000000000006",
        "CustomizationFile" : "UEsDBBQAAgAI..."
    }
    */
    /**
     * Pack the current Solution from Workspace
     * @param saveAsFile true, to save as file.
     */
    public static async packWorkspaceSolution(saveAsFile: boolean = false, environment?: Environment): Promise<string | undefined> {
        let rootPath = vscode.workspace.rootPath;
        if (rootPath === undefined) {
            vscode.window.showErrorMessage('Please open a Folder or Workspace!');
            return;
        }
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: environment ? `Import workspace solution` : `Pack workspace solution`,
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, token: vscode.CancellationToken): Promise<void> => {
            var localSolution = await SolutionUtils.getWorkspaceSolution();
            try {      
                const sourceFolder = `${rootPath}/${Settings.sourceFolder()}`;
                const targetFolder = `${rootPath}/${Settings.outputFolder()}`;
                const solutionName = localSolution !== undefined ? `${localSolution.publisher} ${localSolution.uniqueName} ${localSolution.version}` : `solution`;
                
                const fs   = require("fs");
                if (fs.existsSync(`${targetFolder}/${solutionName}`)) {
                    await fs.rmdirSync(`${targetFolder}/${solutionName}`, { recursive: true });
                }
                if (!fs.existsSync(`${targetFolder}`)) {
                    fs.mkdirSync(`${targetFolder}`, { recursive: true });
                }
                
                await Utils.copyRecursive(sourceFolder, `${targetFolder}/${solutionName}`);

                progress.report({ message: `Compress Json files...` });
                var glob = require("glob-promise");
                var files = await glob.promise(`${targetFolder}/${solutionName}/**/*.json`, {});
                await Promise.all(files.map(async (filename:string) => await Utils.minifyJson(filename, filename) ));
                
                progress.report({ message: `Pack Canvas Apps ...` });
                var files = await fs.readdirSync(`${targetFolder}/${solutionName}/CanvasApps/`);
                await Promise.all(files.map(async (file:string) => {
                    if (token.isCancellationRequested) { return; }
                    if (file.endsWith('_msapp_src')) {
                        const packedPath = `${targetFolder}/${solutionName}/CanvasApps/${file}`.replace("_msapp_src",".msapp");
                        var   result     = await SolutionUtils.packPowerApp(packedPath, `${targetFolder}/${solutionName}/CanvasApps/${file}`, (result) => progress.report({ message: result }));
                        if (result) {
                            await fs.rmdirSync(`${targetFolder}/${solutionName}/CanvasApps/${file}`, { recursive: true });
                        }                
                    }
                }));
                
                if (token.isCancellationRequested) { return; }
                progress.report({ message: `Create Solution Package "${targetFolder}/${solutionName}.zip" ...` });
                var zipper = require('zip-local');
                var zipped = zipper.sync.zip(`${targetFolder}/${solutionName}`).compress();
                if (saveAsFile) { zipped.save(`${targetFolder}/${solutionName}.zip`); }
                await fs.rmdirSync(`${targetFolder}/${solutionName}`, { recursive: true });
                
                if (environment) {
                    var data : any = {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "OverwriteUnmanagedCustomizations": false,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "PublishWorkflows" :                true,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "ImportJobId" :                     uuid.v4(),
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "CustomizationFile" :               Buffer.from(zipped.memory()).toString('base64')
                    };

                    progress.report({ increment: undefined, message: `Upload workspace solution ${solutionName} for import into ${environment.displayName}`});
                    
                    const bearerToken = await OAuthUtils.getCrmToken(environment.instanceApiUrl);
                    const url         = `${environment.instanceApiUrl}/api/data/v9.1/ImportSolution`;
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    var headers : any = { 'Content-Type': 'application/json',       'Authorization': `Bearer ${bearerToken}` };
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    var response = await axios.default.post(url, data, { headers: headers });
                    if (response.status === 204) {
                        vscode.window.showInformationMessage(`Upload solution started for ${environment.displayName}`);
                    } else {
                        vscode.window.showWarningMessage(`Umpload solution returned with Status Code: ${response.status}`);
                    }
                } else if (saveAsFile) {
                    vscode.window.showInformationMessage(`Workspace Solution ${solutionName} packed into ${targetFolder}/${solutionName}.zip`);
                }                                
            } catch (err: any) {
                vscode.window.showErrorMessage(`${err}`);
            }
            return new Promise(resolve=>resolve());
        });
    }
    

    /**
	 * Update the OAuth2 settings of a custom connector.
	 * @param api to update.
	 */
	static async updateOAuth(api: PowerAppsAPI): Promise<void> {
		if (! api) { 
			throw new Error('Method not implemented.');
		}
        try {
            const convert = (data: any) => { return data.properties; };
		    let properties = await this.getPowerAppsAPI(api.environment, api.name, convert); 

            if (! properties?.connectionParameters?.token?.oAuthSettings) {
                return;
            }
            let clientId     = properties?.connectionParameters?.token?.oAuthSettings?.clientId;
            let resourceId   = properties?.connectionParameters?.token?.oAuthSettings?.customParameters?.resourceUri?.value;
            let tenantId     = properties?.connectionParameters?.token?.oAuthSettings?.customParameters?.tenantId?.value;
            
            const keytar  = require('keytar');
            const service = 'mme2k-powerapps-helper';
            let clientSecret = await keytar.getPassword(service, clientId);
            
            resourceId   = await vscode.window.showInputBox({prompt: `Resource-Uri for ${api.displayName}`,   value: resourceId,   ignoreFocusOut: true, placeHolder: 'Enter the Resource-Uri here'});
            if (resourceId) {
                properties.connectionParameters.token.oAuthSettings.customParameters.resourceUri.value = resourceId;
            } else { return; }
            tenantId     = await vscode.window.showInputBox({prompt: `Tenant-Id for ${api.displayName}`,     value: tenantId,     ignoreFocusOut: true, placeHolder: 'Enter the Tenant-Id here'});
            if (tenantId) {
                properties.connectionParameters.token.oAuthSettings.customParameters.tenantId.value = tenantId;
            } else { return; }
            clientId     = await vscode.window.showInputBox({prompt: `Client-Id for ${api.displayName}`,     value: clientId,     ignoreFocusOut: true, placeHolder: 'Enter the Application-Id/Client-Id here'});
            if (clientId) {
                properties.connectionParameters.token.oAuthSettings.clientId = clientId;
            } else { return; }
            clientSecret = await vscode.window.showInputBox({prompt: `Client-Secret for ${api.displayName}`, value: clientSecret, ignoreFocusOut: true, placeHolder: 'Enter the Client-Secret here', password: true});
            if (clientSecret) {
                properties.connectionParameters.token.oAuthSettings.clientSecret = clientSecret;
                if (Settings.cacheAPIConnectionSecretes()) {
                    await keytar.setPassword(service, clientId, clientSecret);
                }
            } else { return; }

            let apiDefinitionUrl = properties.apiDefinitions.originalSwaggerUrl;
            var response         = await axios.default.get(apiDefinitionUrl);
            let apiDefinition    = response.data;
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Update OAuth-Settings for ${api.displayName} in ${api.environment.displayName}`,
                cancellable: true
            }, async (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, token: vscode.CancellationToken): Promise<void> => {
                let apiProperties = {
                    properties: {
                        connectionParameters:   properties.connectionParameters,
                        capabilities:           properties.capabilities,
                        iconBrandColor:         properties.iconBrandColor,
                        iconUri:                properties.iconUri,
                        openApiDefinition:      apiDefinition,
                        //displayName:            apiDefinition.info.title, // only for create
                        backendService: {
                            serviceUrl: `${apiDefinition.schemes[0]}://${apiDefinition.host}${apiDefinition.basePath}`
                        },
                        environment: {
                            id:         api.environment.id,
                            name:       api.environment.name
                        }           
                    }
                };
                if (apiDefinition.info.description) {
                    properties.description = apiDefinition.info.description;
                }

                // Debug
                // await vscode.window.showInputBox({prompt: properties, value: JSON.stringify(apiProperties)});
                if (token.isCancellationRequested) { return; }
                try {                    
                    await APIUtils.updatePowerAppsAPI(api.environment, api.name, apiProperties, await OAuthUtils.getPowerAppAPIToken());
                } catch (err: any) {
                    vscode.window.showErrorMessage(`OAuth-Settings for ${api.displayName} in ${api.environment.displayName} failed.\n\n${err?.response?.data?.error?.message || err}`);
                }
                
                vscode.window.showInformationMessage(`OAuth-Settings for ${api.displayName} in ${api.environment.displayName} updated.`);                
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`OAuth-Settings for ${api.displayName} in ${api.environment.displayName} failed.\n\n${err?.response?.data?.error?.message || err}`);
        }
	}

    /**
     * Get the ParameterXml for PublishXml Action of Crm
     * https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/publishxml?view=dynamics-ce-odata-9
     * @param item Solution, CanvasApp, CloudFlow or Connector
     * @returns the XML that defines which solution components to publish in this request.
     */
     static async publishCustomizations(environment: Environment, parameterXml: string): Promise<void> {
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Publish customizations in ${environment.displayName}.`,
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, token: vscode.CancellationToken): Promise<void> => {
            try {
                const bearerToken = await OAuthUtils.getCrmToken(environment.instanceApiUrl);
                const url         = `${environment.instanceApiUrl}/api/data/v9.1/PublishXml`;
                // eslint-disable-next-line @typescript-eslint/naming-convention
                var headers : any = { 'Content-Type': 'application/json',       'Authorization': `Bearer ${bearerToken}` };
                // eslint-disable-next-line @typescript-eslint/naming-convention
                await axios.default.post(url, { ParameterXml: parameterXml }, { headers: headers });
                vscode.window.showInformationMessage(`Customizations published in ${environment.displayName}.`);
            } catch (err: any) {
                vscode.window.showErrorMessage(`Publish Customizations in ${environment.displayName} failed.\n\n${err?.response?.data?.error?.message || err}`);
            }
            return new Promise(resolve=>resolve());
        });        
     }
}