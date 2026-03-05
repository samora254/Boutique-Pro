
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon, PlusIcon } from './icons';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveLastGarment: () => void;
  onAddGarment: () => void;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onRemoveLastGarment, onAddGarment }) => {
  // Filter out the base layer (index 0) if it has no garments, but keep checking logic consistent
  const displayedLayers = outfitHistory.slice(1); // Assuming index 0 is always just the base model which we might not want to show as "Outfit 1" if it's just the person

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2 flex-grow">
        {displayedLayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-white border border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-500">Your outfit stack is empty.</p>
              <p className="text-xs text-gray-400 mt-1">Save a look to see it here.</p>
            </div>
        ) : (
            displayedLayers.map((layer, index) => {
                // Determine images to show in thumbnail
                const garments = layer.garments && layer.garments.length > 0 
                                 ? layer.garments 
                                 : (layer.garment ? [layer.garment] : []);
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm animate-fade-in"
                  >
                    <div className="flex items-center overflow-hidden">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-gray-600 bg-gray-100 rounded-full">
                          {index + 1}
                        </span>
                        
                        {/* Stack of thumbnails for this layer */}
                        <div className="flex -space-x-2 mr-3">
                           {garments.slice(0, 3).map((g, i) => (
                               <img 
                                key={i} 
                                src={g.url} 
                                alt={g.name} 
                                className="w-10 h-10 object-cover rounded-md border-2 border-white" 
                               />
                           ))}
                           {garments.length > 3 && (
                               <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-md border-2 border-white text-[10px] text-gray-500">
                                   +{garments.length - 3}
                               </div>
                           )}
                        </div>

                        <span className="font-medium text-gray-800 truncate text-sm">
                          Outfit {index + 1}
                        </span>
                    </div>
                    {index === displayedLayers.length - 1 && (
                       <button
                        onClick={onRemoveLastGarment}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                        aria-label="Remove Last Outfit"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
            })
        )}
      </div>
       <button 
          onClick={onAddGarment}
          className="mt-6 w-full flex items-center justify-center text-center bg-gray-900 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 ease-in-out hover:bg-gray-800 active:scale-95 text-sm shadow-md hover:shadow-lg"
      >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Another Garment
      </button>
    </div>
  );
};

export default OutfitStack;
