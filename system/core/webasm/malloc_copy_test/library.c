#include "common_header.h"

char* malloc_copy(char* input)
{   
    usize len = strlen(input) + 1;

    char* result = (char*)malloc(len);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, len);

    return result;
}

void malloc_free(char* input)
{
    free(input);
}

float32 my_sin(float32 val) 
{
    return sinf(val);
}
