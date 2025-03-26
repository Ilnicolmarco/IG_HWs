// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    const background_width = bgImg.width;
    const background_height = bgImg.height;

    const foreground_width = fgImg.width;
    const foreground_height = fgImg.height;

    const background_pixel_data = bgImg.data;
    
    const foreground_pixel_data = fgImg.data;

    //Per ogni riga
    for (let foreground_y = 0; foreground_y < foreground_height; foreground_y++) {
        
        const background_y = foreground_y + fgPos.y;

        if (background_y < 0 || background_y >= background_height) 
            continue; //salto se sforo

        //Per ogni colonna
        for (let foreground_x = 0; foreground_x < foreground_width; foreground_x++) {

            const background_x = foreground_x + fgPos.x;
            if (background_x < 0 || background_x >= background_width) 
                continue; //salto se sforo

            const f_alpha = (foreground_pixel_data[(foreground_y * foreground_width + foreground_x) * 4 + 3] / 255) * fgOpac; //alfa fronte
            if (f_alpha === 0)
                continue; //salto se totalmente trapsarente

            const b_alpha = background_pixel_data[(background_y * background_width + background_x) * 4 + 3] / 255; //alfa sfondo
            const output_alpha = f_alpha + b_alpha * (1 - f_alpha); //alpha totale
            //console.log(output_alpha);





            //Per ogni canale RGB
            for (let channel = 0; channel < 3; channel++) {
                const foreground_channel_value = foreground_pixel_data[(foreground_y * foreground_width + foreground_x) * 4 + channel] / 255;
                const background_channel_value = background_pixel_data[(background_y * background_width + background_x) * 4 + channel] / 255;

                //mixo
                const output_channel_value = (foreground_channel_value * f_alpha + background_channel_value * b_alpha * (1 - f_alpha)) /output_alpha;

                //scrivo valore nello sfondo
                background_pixel_data[(background_y * background_width + background_x) * 4 + channel] = Math.round(output_channel_value * 255); 
            }
            
        }
    }
}
