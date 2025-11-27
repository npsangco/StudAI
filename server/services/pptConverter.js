// services/pptConverter.js
import fs from 'fs';
import path from 'path';

export async function convertOrExtractPPT(inputPath) {
    // Try CloudConvert (if API key available)
    if (process.env.CLOUDCONVERT_API_KEY) {
        try {
            return await convertPPTtoPPTXCloudConvert(inputPath);
        } catch (err) {
            console.warn('⚠️ CloudConvert failed:', err.message);
        }
    }

    // Fallback: Return error - PPT files need CloudConvert
    throw new Error('PPT files require CloudConvert API key. Please add CLOUDCONVERT_API_KEY to .env or convert to PPTX manually.');
}

async function convertPPTtoPPTXCloudConvert(inputPath) {
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    
    if (!apiKey) {
        throw new Error('CLOUDCONVERT_API_KEY not set in environment variables');
    }

    try {
        const CloudConvert = (await import('cloudconvert')).default;
        const cloudConvert = new CloudConvert(apiKey);

        console.log('🔄 Starting CloudConvert PPT → PPTX conversion...');

        // Upload file
        const uploadTask = await cloudConvert.tasks.create({
            operation: 'import/upload'
        });

        const fileStream = fs.createReadStream(inputPath);
        await cloudConvert.tasks.upload(uploadTask, fileStream, path.basename(inputPath));

        // Convert PPT to PPTX
        const convertTask = await cloudConvert.tasks.create({
            operation: 'convert',
            input: uploadTask.id,
            input_format: 'ppt',
            output_format: 'pptx'
        });

        // Wait for conversion
        const job = await cloudConvert.jobs.create({
            tasks: [uploadTask, convertTask, {
                operation: 'export/url',
                input: convertTask.id
            }]
        });

        const completedJob = await cloudConvert.jobs.wait(job.id);
        const exportTask = completedJob.tasks.filter(task => task.operation === 'export/url')[0];
        
        if (!exportTask || !exportTask.result?.files?.[0]?.url) {
            throw new Error('Conversion failed - no download URL');
        }

        const downloadUrl = exportTask.result.files[0].url;
        
        // Download converted file
        const outputPath = inputPath.replace('.ppt', '.pptx');
        const response = await fetch(downloadUrl);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(buffer));

        console.log('✅ CloudConvert conversion successful:', outputPath);
        return outputPath;

    } catch (error) {
        console.error('❌ CloudConvert conversion failed:', error.message);
        throw error;
    }
}

export function cleanupTempFiles(...filePaths) {
    for (const filePath of filePaths) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up: ${filePath}`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to clean up ${filePath}:`, error.message);
        }
    }
}